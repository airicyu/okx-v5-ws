import { OkxV5Ws } from './OkxV5Ws'
import { sleep } from './util'

const run = async () => {
    try {
        const okxV5Ws = new OkxV5Ws({
            serverBaseUrl: OkxV5Ws.DEMO_PRIVATE_ENDPOINT,
            profileConfig: {
                apiKey: 'AAAAA',
                secretKey: 'BBBBB',
                passPhrase: 'CCCCC',
            },
            options: {
                logLoginMessage: false,
                logSubscriptionMessage: false,
                logChannelTopicMessage: false,
                logTradeMessage: false,
            },
        })

        await okxV5Ws.connect()

        await okxV5Ws.subscribeChannel({
            channel: 'account',
            ccy: 'USDT',
        })

        okxV5Ws.addChannelMessageHandler({ channel: 'account', ccy: 'USDT' }, (message) => {
            console.log(`message handler: `, JSON.stringify(message))
        })
    } catch (e) {
        console.error(e)
    }
}
run()
