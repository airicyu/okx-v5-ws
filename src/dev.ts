import { OkxV5Ws } from './OkxV5Ws'
import { sleep } from './util'

const run = async () => {
    try {
        const okxV5Ws = new OkxV5Ws({
            serverBaseUrl: OkxV5Ws.DEMO_PUBLIC_ENDPOINT,
            options: {
                logLoginMessage: false,
                logSubscriptionMessage: false,
                logChannelTopicMessage: false,
                logTradeMessage: false,
            },
            messageHandler: (message: string) => {
                console.log(`Received message: ${message}`)
            },
        })

        await okxV5Ws.connect()

        await okxV5Ws.send({
            op: 'subscribe',
            args: [
                {
                    channel: 'status',
                },
            ],
        })

        await sleep(3000)

        okxV5Ws.close()

        // const subResult = await okxV5Ws.subscribeChannel({
        //     channel: 'tickers',
        //     instId: 'BTC-USDT',
        // })
        // console.log(subResult)

        // okxV5Ws.addChannelMessageHandler({ channel: 'tickers', instId: 'BTC-USDT' }, (message) => {
        //     console.log(`message handler: `, JSON.stringify(message))
        // })
    } catch (e) {
        console.error(e)
    }
}
run()
