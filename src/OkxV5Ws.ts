import hmacSHA256 from 'crypto-js/hmac-sha256'
import Base64 from 'crypto-js/enc-base64'
import { WSConnector } from './WSConnector'
import { ErrorCodes } from './ErrorCodes'
import { v4 as uuidv4 } from 'uuid'
import { normalizeSubscriptionTopic } from './util'
import EventEmitter from 'events'

/**
 * Provide service level function to user
 */
class OkxV5Ws {
    #serverBaseUrl: string
    #profileConfig?: {
        apiKey: string
        secretKey: string
        passPhrase: string
    }
    #options: {
        autoLogin: boolean
        logLoginMessage: boolean
        logSubscriptionMessage: boolean
        logChannelTopicMessage: boolean
        logTradeMessage: boolean
    }

    // ws connection handling instance
    #wsConnector: WSConnector

    // events connector
    #eventEmitter = new EventEmitter()

    /**
     * Queues for piping operation one by one
     */
    #operationQueue: OperationQueueItem[] = []

    /**
     * Queues for handling response for event types
     */
    #loginReqs: HandleResponse<LoginResponse>[] = []
    #subChannelReqs: (HandleResponse<SubscriptionResponse> | HandleResponse<UnsubscriptionResponse>)[] = []
    #tradeReqsMap = new Map<string, Map<string, HandleResponse<TradeResponse>[]>>()
    #channelTopicMessageHandlersMap = new Map<string, ChannelMessageHandler[]>()

    /**
     * map of Trade OP codes
     */
    static #tradeOps = {
        order: true,
        'batch-orders': true,
        'cancel-order': true,
        'batch-cancel-orders': true,
        'amend-order': true,
        'batch-amend-orders': true,
    }

    static PUBLIC_ENDPOINT = 'wss://wsaws.okx.com:8443/ws/v5/public'
    static PRIVATE_ENDPOINT = 'wss://wsaws.okx.com:8443/ws/v5/private'
    static DEMO_PUBLIC_ENDPOINT = 'wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999'
    static DEMO_PRIVATE_ENDPOINT = 'wss://wspap.okx.com:8443/ws/v5/private?brokerId=9999'

    /**
     * constructor
     */
    constructor({
        serverBaseUrl,
        profileConfig,
        options,
        messageHandler,
    }: {
        serverBaseUrl: string
        profileConfig?: {
            apiKey: string
            secretKey: string
            passPhrase: string
        }
        options?: {
            autoLogin?: boolean
            logLoginMessage?: boolean
            logSubscriptionMessage?: boolean
            logChannelTopicMessage?: boolean
            logTradeMessage?: boolean
        }
        messageHandler?: (message: string) => any
    }) {
        this.#serverBaseUrl = serverBaseUrl
        this.#profileConfig = profileConfig
        this.#options = {
            autoLogin: options?.autoLogin ?? true,
            logLoginMessage: options?.logLoginMessage ?? true,
            logSubscriptionMessage: options?.logSubscriptionMessage ?? true,
            logChannelTopicMessage: options?.logChannelTopicMessage ?? false,
            logTradeMessage: options?.logTradeMessage ?? true,
        }

        /**
         * initialize WSConnector
         */
        this.#wsConnector = new WSConnector({
            serverBaseUrl: this.#serverBaseUrl,
            afterConnected: this.#afterConnected,
        })

        /**
         * connecting the events
         */
        this.#wsConnector.event.on('message', this.#onMessage)
        this.#wsConnector.event.on('connect', (code: number, desc: string) => {
            this.#eventEmitter.emit('connect', code, desc)
        })
        this.#wsConnector.event.on('reconnecting', () => {
            this.#eventEmitter.emit('reconnecting')
        })
        this.#wsConnector.event.on('close', (code: number, desc: string) => {
            this.#eventEmitter.emit('close', code, desc)
        })
        this.#wsConnector.event.on('closed', (code: number, desc: string) => {
            this.#eventEmitter.emit('closed', code, desc)
        })
        this.#wsConnector.event.on('error', (error) => this.#eventEmitter.emit('error', error))

        if (messageHandler) {
            console.warn('messageHandler is deprecated. Please use okxV5Ws.event on message event')
            this.#eventEmitter.on('message', messageHandler)
        }
    }

    /**
     * Get the event emitter
     */
    get event() {
        return this.#eventEmitter
    }

    /**
     * start connecting to server
     */
    async connect() {
        await this.#wsConnector.connect()
    }

    /**
     * sending message payload to server
     *
     * @param payload
     */
    async send(payload: object) {
        this.#checkConnection()
        await this.#wsConnector.send(JSON.stringify(payload))
    }

    /**
     * subscribe channel topic
     *
     * @param subscriptionTopic
     * @returns
     */
    async subscribeChannel(subscriptionTopic: SubscriptionTopic): Promise<SubscriptionResponse> {
        return this.#waitOperationQueue<SubscriptionResponse>(this.#operationQueue, 'subscribe', async () => {
            const topic = normalizeSubscriptionTopic(subscriptionTopic)
            console.log(`subscribe channel ${JSON.stringify(topic)}`)

            this.#checkConnection()

            return new Promise<SubscriptionResponse>((resolve, reject) => {
                this.send({
                    op: 'subscribe',
                    args: [topic],
                })

                this.#subChannelReqs.push({ resolve, reject })
            })
        }).catch((e) => {
            console.error(e)
            throw e
        })
    }

    /**
     * unsubscribe channel topic
     *
     * @param subscriptionTopic
     * @returns
     */
    async unsubscribeChannel(subscriptionTopic: SubscriptionTopic): Promise<UnsubscriptionResponse> {
        return this.#waitOperationQueue<UnsubscriptionResponse>(this.#operationQueue, 'unsubscribe', async () => {
            const topic = normalizeSubscriptionTopic(subscriptionTopic)
            console.log(`unsubscribe channel ${JSON.stringify(topic)}`)

            this.#checkConnection()

            return new Promise<UnsubscriptionResponse>((resolve, reject) => {
                this.send({
                    op: 'unsubscribe',
                    args: [topic],
                })

                this.#subChannelReqs.push({ resolve, reject })
            })
        }).catch((e) => {
            console.error(e)
            throw e
        })
    }

    /**
     * Add channel topic message handler
     *
     * @param subscriptionTopic
     * @param channelMessageHandler
     */
    addChannelMessageHandler(subscriptionTopic: SubscriptionTopic, channelMessageHandler: ChannelMessageHandler) {
        const topic = normalizeSubscriptionTopic(subscriptionTopic)
        console.log(`add ChannelMessageHandler for ${JSON.stringify(topic)}`)
        const key = JSON.stringify(topic)
        let messageHandlers = this.#channelTopicMessageHandlersMap.get(key)
        if (!messageHandlers) {
            messageHandlers = [channelMessageHandler]
            this.#channelTopicMessageHandlersMap.set(key, messageHandlers)
        } else {
            messageHandlers.push(channelMessageHandler)
        }
    }

    /**
     * Remove channel topic message handler
     *
     * @param subscriptionTopic
     * @param channelMessageHandler
     */
    removeChannelMessageHandler(subscriptionTopic: SubscriptionTopic, channelMessageHandler: ChannelMessageHandler) {
        const topic = normalizeSubscriptionTopic(subscriptionTopic)
        console.log(`remove ChannelMessageHandler for ${JSON.stringify(topic)}`)
        const key = JSON.stringify(topic)
        let messageHandlers = this.#channelTopicMessageHandlersMap.get(key)
        if (messageHandlers) {
            messageHandlers = messageHandlers.filter((handler) => handler !== channelMessageHandler)
            if (messageHandlers.length > 0) {
                this.#channelTopicMessageHandlersMap.set(key, messageHandlers)
            } else {
                this.#channelTopicMessageHandlersMap.delete(key)
            }
        }
    }

    /**
     * Remove that channel topic's ALL message handler
     *
     * @param subscriptionTopic
     */
    removeAllChannelMessageHandler(subscriptionTopic: SubscriptionTopic) {
        const topic = normalizeSubscriptionTopic(subscriptionTopic)
        console.log(`removeAll ChannelMessageHandler for ${JSON.stringify(topic)}`)
        const key = JSON.stringify(topic)
        this.#channelTopicMessageHandlersMap.delete(key)
    }

    /**
     * Send trade op message
     *
     * @param payload
     * @returns
     */
    async trade(payload: TradePayload): Promise<TradeResponse> {
        const op = payload.op

        if (!OkxV5Ws.#tradeOps[op]) {
            throw new Error('Unknown OP')
        }

        // add id if omitted
        if (payload.id === undefined) {
            payload = { id: uuidv4().replaceAll('-', ''), ...payload }
        }

        // append req queue and wait for reply
        let opReqsMap = this.#tradeReqsMap.get(op)
        if (opReqsMap === undefined) {
            opReqsMap = new Map<string, HandleResponse<TradeResponse>[]>()
            this.#tradeReqsMap.set(op, opReqsMap)
        }

        let opReqs = opReqsMap.get(payload.id!)
        if (opReqs === undefined) {
            opReqs = new Array<HandleResponse<TradeResponse>>()
        }
        opReqsMap.set(payload.id!, opReqs)

        return new Promise<TradeResponse>((resolve, reject) => {
            this.send(payload)

            opReqs!.push({ resolve, reject })
        }).catch((e) => {
            console.error(e)
            throw e
        })
    }

    /**
     * Waiting the operation in a single processing queue
     * @param operationQueue
     * @param op
     * @param process
     * @returns
     */
    async #waitOperationQueue<T>(operationQueue: OperationQueueItem[], op: string, process: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const isEmptyQueue = operationQueue.length === 0

            operationQueue.push({
                op,
                execute: async () => {
                    return process()
                        .then((data: T) => {
                            resolve(data)
                        })
                        .catch((e) => {
                            reject(e)
                        })
                        .finally(() => {
                            return this.#pullNextOperation(operationQueue)
                        })
                },
            })

            if (isEmptyQueue) {
                operationQueue[0].execute()
            }
        })
    }

    /**
     * Remove the first item in queue. And pull next operation to run.
     * @param operationQueue
     * @returns
     */
    async #pullNextOperation(operationQueue: OperationQueueItem[]): Promise<void> {
        if (operationQueue.length === 0) {
            return
        }
        operationQueue.shift() // remove the first one as it is finished
        if (operationQueue.length > 0) {
            await operationQueue[0].execute() // trigger next
            return
        }
        return
    }

    /**
     * check connection connected
     */
    #checkConnection() {
        if (!this.#wsConnector.connected) {
            throw new Error('Connection not available')
        }
    }

    /**
     * Do login authentication handshake
     */
    async #authentication(): Promise<LoginResponse> {
        return this.#waitOperationQueue<LoginResponse>(this.#operationQueue, 'login', async () => {
            this.#checkConnection()
            const timestamp = ('' + Date.now()).slice(0, -3)
            const payload = `${timestamp}GET/users/self/verify`
            const sign = Base64.stringify(hmacSHA256(payload, this.#profileConfig?.secretKey ?? ''))

            return new Promise<LoginResponse>((resolve, reject) => {
                this.send({
                    op: 'login',
                    args: [
                        {
                            apiKey: this.#profileConfig?.apiKey ?? '',
                            passphrase: this.#profileConfig?.passPhrase ?? '',
                            timestamp: timestamp,
                            sign: sign,
                        },
                    ],
                })

                this.#loginReqs.push({
                    resolve,
                    reject,
                })
            })
        })
    }

    /**
     * After-connected-logic, probably do auto login
     */
    #afterConnected = async () => {
        // reset queues
        this.#operationQueue = []
        this.#loginReqs = []
        this.#subChannelReqs = []
        this.#tradeReqsMap = new Map<string, Map<string, HandleResponse<TradeResponse>[]>>()
        this.#channelTopicMessageHandlersMap = new Map<string, ChannelMessageHandler[]>()

        if (this.#options.autoLogin && this.#profileConfig?.apiKey) {
            await this.#authentication()
        }
    }

    /**
     * Handle when receiving server side messages
     * @param message
     * @returns
     */
    #onMessage = (message: string) => {
        this.#eventEmitter.emit('message', message)

        if (message === 'pong') {
            return
        }

        let messageObj: any = null
        try {
            messageObj = JSON.parse(message)
            let eventType = messageObj?.event

            // channel messages
            if (!eventType && messageObj?.arg?.channel) {
                const topicKey = JSON.stringify(messageObj.arg)
                const handlers = this.#channelTopicMessageHandlersMap.get(topicKey)
                if (this.#options.logChannelTopicMessage) {
                    console.debug(`Received Topic Msg: '${message}'`)
                }
                if (handlers) {
                    for (const handler of handlers) {
                        handler(messageObj)
                    }
                }
                return
            }

            const code: string = (messageObj?.code as string) || ''

            let isError = false
            if (typeof messageObj?.code === 'string') {
                isError = messageObj?.code !== '0'
            } else if (messageObj?.event === 'error') {
                isError = true
            }
            const msg: string = (messageObj?.msg as string) ?? ''
            const op = messageObj?.op ?? ''

            if (isError && code === ErrorCodes.INVALID_REQUEST) {
                const match = messageObj.msg?.match(/Invalid request: {"op": "([a-zA-Z0-9\\-]+)"/)
                if (match && match[1]) {
                    eventType = match[1]
                }
            }

            /**
             * Some common error for login operation
             */
            if (
                isError &&
                (code === ErrorCodes.LOGIN_FAILED ||
                    code === ErrorCodes.BULK_LOGIN_PARTIALLY_SUCCEEDED ||
                    code === ErrorCodes.INVALID_SIGN ||
                    code === ErrorCodes.INVALID_OK_ACCESS_KEY)
            ) {
                eventType = 'login'
            }

            // channel subscribe -> does not exist
            if (isError && code === ErrorCodes.DOES_NOT_EXIST && msg.startsWith('channel:')) {
                eventType = 'subscribe'
            }

            // channel not supported for public/private error
            if (isError && code === ErrorCodes.ENDPOINT_NOT_SUPPORT_SUBSCRIBE_CHANNEL) {
                eventType = 'subscribe'
            }

            // cannot interpret as error actual event type
            if (isError && eventType === 'error') {
                if (this.#operationQueue.length > 0) {
                    eventType = this.#operationQueue[0].op
                }
            }

            // op code for trade operations
            if (op && OkxV5Ws.#tradeOps[op]) {
                eventType = 'trade'
            }

            /**
             * Handle for "login" message response
             */
            if (eventType === 'login') {
                if (this.#options.logLoginMessage) {
                    console.debug(`Received Login response: '${message}'`)
                }
                const response = this.#loginReqs.shift()
                if (response) {
                    if (isError) {
                        response.reject(messageObj)
                    } else {
                        response.resolve(messageObj)
                    }
                }
                return
            }

            /**
             * Handle for "subscribe" message response
             */
            if (eventType === 'subscribe') {
                if (this.#options.logLoginMessage) {
                    console.debug(`Received Sub response: '${message}'`)
                }
                const response = this.#subChannelReqs.shift()
                if (response) {
                    if (isError) {
                        response.reject(messageObj)
                    } else {
                        response.resolve(messageObj)
                    }
                }
                return
            }

            /**
             * Handle for "unsubscribe" message response
             */
            if (eventType === 'unsubscribe') {
                if (this.#options.logLoginMessage) {
                    console.debug(`Received Unsub response: '${message}'`)
                }
                const response = this.#subChannelReqs.shift()
                if (response) {
                    if (isError) {
                        response.reject(messageObj)
                    } else {
                        response.resolve(messageObj)
                    }
                }
                return
            }

            /**
             * Handle for "trade" message response
             */
            if (eventType === 'trade') {
                const id = messageObj.id
                if (this.#options.logTradeMessage) {
                    console.debug(`Received Trade response for op ${op}, id ${id}: '${message}'`)
                }
                if (id) {
                    const opReqsMap = this.#tradeReqsMap.get(op)
                    const responses = opReqsMap?.get(id)
                    const response = responses?.shift()
                    if (responses?.length === 0) {
                        opReqsMap?.delete(id)
                    }

                    if (response) {
                        if (isError) {
                            response.reject(messageObj)
                        } else {
                            response.resolve(messageObj)
                        }
                    }
                }
                return
            }
        } catch (e) {
            console.error(e)
        }
    }

    /**
     * close connection
     */
    close() {
        this.#wsConnector.close()
    }
}

export { OkxV5Ws }
