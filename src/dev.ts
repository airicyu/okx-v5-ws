import { OkxV5Ws } from './OkxV5Ws'
import { sleep } from './util'

const run = async () => {
    try {
        const okxV5Ws = new OkxV5Ws({
            serverBaseUrl: OkxV5Ws.DEMO_PUBLIC_ENDPOINT,
            // profileConfig: {
            //     apiKey: 'XXXXXX',
            //     secretKey: 'YYYYY',
            //     passPhrase: 'ZZZZZ',
            // },
            options: {
                logLoginMessage: false,
                logSubscriptionMessage: false,
                logChannelTopicMessage: false,
                logTradeMessage: false,
            },
            // messageHandler: (message: string) => {
            //     console.log(`Received message: ${message}`)
            // },
        })

        await okxV5Ws.event.on('connect', () => {
            console.log(`on connect`)
        })

        await okxV5Ws.event.on('message', (message: string) => {
            console.log(`Received message: ${message}`)
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
    } catch (e) {
        console.error(e)
    }
}
run()

// const run = async () => {
//     try {
//         const okxV5Ws = new OkxV5Ws({
//             serverBaseUrl: OkxV5Ws.DEMO_PUBLIC_ENDPOINT,
//             // profileConfig: {
//             //     apiKey: 'AAAAA',
//             //     secretKey: 'BBBBB',
//             //     passPhrase: 'CCCCC',
//             // },
//             options: {
//                 logLoginMessage: false,
//                 logSubscriptionMessage: false,
//                 logChannelTopicMessage: false,
//                 logTradeMessage: false,
//             },
//             // messageHandler: (message: string) => {
//             //     console.log(`messageHandler: ${message}`)
//             // },
//         })

//         await okxV5Ws.connect()

//         // await okxV5Ws.subscribeChannel({
//         //     channel: 'tickers',
//         //     instId: 'BTC-USDT',
//         // })

//         okxV5Ws.event.on('message', (message: string) => {
//             console.log(`messageHandler: ${message}`)
//         })

//         okxV5Ws.event.on('close', (code: string, desc: string) => {
//             console.log(`close event, ${code}, ${desc}`)
//         })
//         okxV5Ws.event.on('closed', (code: string, desc: string) => {
//             console.log(`closed event, ${code}, ${desc}`)
//         })
//         await sleep(3000)

//         // okxV5Ws.close()

//         // okxV5Ws.addChannelMessageHandler({ channel: 'tickers', instId: 'BTC-USDT' }, (message) => {
//         //     console.log(`message handler: `, JSON.stringify(message))
//         // })

//         // await okxV5Ws.subscribeChannel({
//         //     channel: 'account',
//         //     ccy: 'USDT',
//         // })

//         // okxV5Ws.addChannelMessageHandler({ channel: 'account', ccy: 'USDT' }, (message) => {
//         //     console.log(`message handler: `, JSON.stringify(message))
//         // })
//     } catch (e) {
//         console.error(e)
//     }
// }
// run()
