import websocket, { IStringified } from 'websocket'
const WebSocketClient = websocket.client
import { sleep } from './util'
import EventEmitter from 'events'

/**
 * Handle WS connection level logic
 */
class WSConnector {
    #serverBaseUrl: string

    // connection state
    #connectState: 'closed' | 'connecting' | 'connected' | 'reconnecting' = 'closed'

    /* reconnect state data */
    #reconnectionAttempts = 0
    #reconnectionMaxAttempts = Infinity

    /* WS connection instances */
    #connection: websocket.connection | null = null
    #client = new WebSocketClient()

    // after-connected handler
    #afterConnected: () => Promise<void>

    /* states & timers for handle ping pong */
    #pingTimer: any = null
    #waitPongTimer: any = null
    #lastMessageReceiveTimestamp: number

    // events connector
    #eventEmitter = new EventEmitter()

    /**
     * constructor
     */
    constructor({ serverBaseUrl, afterConnected }: { serverBaseUrl: string; afterConnected: () => Promise<void> }) {
        this.#serverBaseUrl = serverBaseUrl
        this.#afterConnected = afterConnected
        this.#lastMessageReceiveTimestamp = Date.now()

        this.#client.on('connectFailed', function (error) {
            console.error('Connect Error: ' + error.toString())
        })

        this.#client.on('connect', (connection) => {
            this.#connectState = 'connected'
            this.#connection = connection
            this.#reconnectionAttempts = 0

            console.log('WebSocket Client Connected')

            connection.on('error', (error: Error) => {
                console.error('Connection Error: ' + error.toString())
                this.#eventEmitter.emit('error', error)
            })

            connection.on('close', (code: number, desc: string) => {
                this.#eventEmitter.emit('close', code, desc)
                // reset ping pong state
                clearInterval(this.#pingTimer)
                clearInterval(this.#waitPongTimer)

                console.log(`Connection Closed. code=${code}, desc=${desc}`)
                this.#connectState = 'closed'
                if (code !== 1000) {
                    this.reconnect()
                } else {
                    this.#eventEmitter.emit('closed', code, desc)
                }
            })

            connection.on('message', (message) => {
                // reset ping pong state
                this.#lastMessageReceiveTimestamp = Date.now()
                clearTimeout(this.#pingTimer)
                clearTimeout(this.#waitPongTimer)
                this.#pingTimer = setTimeout(this.#ping, 15_000)

                if (message.type === 'utf8') {
                    this.#eventEmitter.emit('message', message.utf8Data)
                }
            })

            this.#eventEmitter.emit('connect')
        })
    }

    get event() {
        return this.#eventEmitter
    }

    get connected() {
        return this.#connectState === 'connected'
    }

    get connection() {
        return this.#connection
    }

    /**
     * connect to server
     */
    async connect(): Promise<boolean> {
        if (this.#connectState === 'connected') {
            return true
        }

        // connect if not already connecting
        if (this.#connectState !== 'connecting') {
            this.#client.connect(this.#serverBaseUrl)
        }

        this.#connectState = 'connecting'

        return new Promise((resolve, reject) => {
            const connected = () => {
                this.#client.removeListener('connectFailed', connectFailed)
                resolve(true)
            }

            const connectFailed = (error: Error) => {
                this.#client.removeListener('connect', connected)
                reject(error)
            }
            this.#client.once('connect', connected)
            this.#client.once('connectFailed', connectFailed)
        })
            .then(this.#afterConnected)
            .then(() => true)
    }

    /**
     * do reconnect
     */
    async reconnect(): Promise<void> {
        if (this.#connectState === 'connected' || this.#connectState === 'reconnecting') {
            return
        }

        this.#eventEmitter.emit('reconnect')

        this.#connectState = 'reconnecting'

        return new Promise((resolve, reject) => {
            this.#client.once('connect', () => {
                resolve()
            })
            ;(async () => {
                while (this.#connectState === 'reconnecting' && this.#reconnectionAttempts < this.#reconnectionMaxAttempts) {
                    await sleep(5000)
                    this.#reconnectionAttempts++
                    await this.connect()
                }
                if (this.#connectState === 'reconnecting') {
                    reject(new Error('Reconnet fail after all attempts'))
                }
            })()
        })
    }

    /**
     * send message to server
     *
     * @param data
     * @returns
     */
    async send(data: Buffer | IStringified): Promise<void> {
        console.debug('send: ', data)
        return new Promise((resolve, reject) => {
            this.#connection?.send(data, (err?: Error) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    /**
     * close connection
     */
    close = () => {
        this.#connection?.close(1000)
    }

    /**
     * send ping and wait pong or disconnect
     */
    #ping = async () => {
        if (this.#connectState === 'connected') {
            clearTimeout(this.#waitPongTimer)
            await this.send('ping')
            this.#waitPongTimer = setTimeout(() => {
                if (this.#connectState === 'connected' && Date.now() - this.#lastMessageReceiveTimestamp >= 15_000) {
                    this.#connection?.close(1001)
                }
            }, 15_000)
        }
    }
}

export { WSConnector }
