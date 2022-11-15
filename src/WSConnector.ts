import websocket, { IStringified } from 'websocket'
const WebSocketClient = websocket.client
import { sleep } from './util'

class WSConnector {
    #serverBaseUrl: string

    #connectState: 'closed' | 'connecting' | 'connected' | 'reconnecting' = 'closed'

    #reconnectionAttempts = 0
    #reconnectionMaxAttempts = Infinity
    #connection: websocket.connection | null = null
    #client = new WebSocketClient()
    #messageHandler: (message: string) => void
    #afterConnected: () => Promise<void>
    #pingTimer: any = null
    #waitPongTimer: any = null
    #lastMessageReceiveTimestamp: number

    constructor({
        serverBaseUrl,
        afterConnected,
        messageHandler,
    }: {
        serverBaseUrl: string
        afterConnected: () => Promise<void>
        messageHandler: (message: string) => void
    }) {
        this.#serverBaseUrl = serverBaseUrl
        this.#afterConnected = afterConnected
        this.#messageHandler = messageHandler
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
                console.log('Connection Error: ' + error.toString())
            })
            connection.on('close', (code: number, desc: string) => {
                clearInterval(this.#pingTimer)
                clearInterval(this.#waitPongTimer)
                console.log(`Connection Closed. code=${code}, desc=${desc}`)
                this.#connectState = 'closed'
                if (code !== 1000) {
                    this.reconnect()
                }
            })
            connection.on('message', (message) => {
                this.#lastMessageReceiveTimestamp = Date.now()
                clearTimeout(this.#pingTimer)
                clearTimeout(this.#waitPongTimer)
                this.#pingTimer = setTimeout(this.#ping, 15_000)
                if (message.type === 'utf8') {
                    this.#messageHandler(message.utf8Data)
                }
            })
        })
    }

    get connected() {
        return this.#connectState === 'connected'
    }

    get connection() {
        return this.#connection
    }

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

    async reconnect(): Promise<void> {
        if (this.#connectState === 'connected' || this.#connectState === 'reconnecting') {
            return
        }

        this.#connectState = 'reconnecting'

        return new Promise((resolve, reject) => {
            this.#client.once('connect', () => {
                resolve()
            })
            ;(async () => {
                while (this.#connectState === 'reconnecting' && this.#reconnectionAttempts < this.#reconnectionMaxAttempts) {
                    this.#reconnectionAttempts++
                    await this.connect()
                    await sleep(5000)
                }
                if (this.#connectState === 'reconnecting') {
                    reject(new Error('Reconnet fail after all attempts'))
                }
            })()
        })
    }

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

    close = () => {
        this.#connection?.close(1000)
    }

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
