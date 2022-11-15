# okx-v5-ws

This is a non-official [OKX V5 websocket](https://www.okx.com/docs-v5/) SDK for javascript.

# install

npm install okx-v5-ws

------------

# Hello world

Subscribe channel topic + register message handler to log message

main.js

```javascript
import { OkxV5Ws } from 'okx-v5-ws'

const run = async () => {
    try {
        const okxV5Ws = new OkxV5Ws({
            serverBaseUrl: OkxV5Ws.DEMO_PUBLIC_ENDPOINT,
            profileConfig: {
                apiKey: 'XXXXXX',
                secretKey: 'YYYYY',
                passPhrase: 'ZZZZZ',
            },
        })

        await okxV5Ws.connect()

        const subResult = await okxV5Ws.subscribeChannel({
            channel: 'tickers',
            instId: 'BTC-USDT',
        })
        console.log(subResult)
    } catch (e) {
        console.error(e)
    }
}
run()
```

output
```
WebSocket Client Connected
send:  {"op":"login","args":[{"apiKey":"XXXXXX","passphrase":"ZZZZZZZ","timestamp":"1668518942","sign":"AAAAAAA"}]}
Received Login response: '{"event":"login", "msg" : "", "code": "0"}'
subscribe channel {"channel":"tickers","instId":"BTC-USDT"}
send:  {"op":"subscribe","args":[{"channel":"tickers","instId":"BTC-USDT"}]}
Received Sub response: '{"event":"subscribe","arg":{"channel":"tickers","instId":"BTC-USDT"}}'
{ event: 'subscribe', arg: { channel: 'tickers', instId: 'BTC-USDT' } }
add ChannelMessageHandler for {"channel":"tickers","instId":"BTC-USDT"}
message handler:  {"arg":{"channel":"tickers","instId":"BTC-USDT"},"data":[{"instType":"SPOT","instId":"BTC-USDT","last":"16873.2","lastSz":"0.031691","askPx":"16873.2","askSz":"44.29802254","bidPx":"16873.1","bidSz":"46.4672405","open24h":"17151","high24h":"17171.5","low24h":"16035.8","sodUtc0":"16621.7","sodUtc8":"16592.1","volCcy24h":"23439950838.7692894","vol24h":"1406376.80413155","ts":"1668518940833"}]}
message handler:  {"arg":{"channel":"tickers","instId":"BTC-USDT"},"data":[{"instType":"SPOT","instId":"BTC-USDT","last":"16873.2","lastSz":"0.02995019","askPx":"16873.2","askSz":"44.26807235","bidPx":"16873.1","bidSz":"46.4672405","open24h":"17151","high24h":"17171.5","low24h":"16035.8","sodUtc0":"16621.7","sodUtc8":"16592.1","volCcy24h":"23439951344.12483531","vol24h":"1406376.83408174","ts":"1668518941182"}]}
message handler:  {"arg":{"channel":"tickers","instId":"BTC-USDT"},"data":[{"instType":"SPOT","instId":"BTC-USDT","last":"16873.2","lastSz":"0.05232543","askPx":"16873.2","askSz":"44.16731862","bidPx":"16873.1","bidSz":"46.4672405","open24h":"17151","high24h":"17171.5","low24h":"16035.8","sodUtc0":"16621.7","sodUtc8":"16592.1","volCcy24h":"23439953044.16267235","vol24h":"1406376.93483547","ts":"1668518941291"}]}
...
...
...
```

This module basically has some managed method to help you do:
- Login
- Subscribe to channel topic, and receive messages
- Send Trade message, and receive response
- Ping Pong / Auto reconnect

------

## Free Control Style

If you feel the above managed feature are messy/not work, we provide you some way to control send/receive message yourself.

- Passing `messageHandler`: You can receive all messages from server.
- Call `send` method: You can directly sending message to server.

```javascript
const okxV5Ws = new OkxV5Ws({
    serverBaseUrl: OkxV5Ws.DEMO_PUBLIC_ENDPOINT,
    profileConfig: {
            apiKey: 'XXXXXX',
            secretKey: 'YYYYY',
            passPhrase: 'ZZZZZ',
    },
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
```

output
```
WebSocket Client Connected
send:  {"op":"login","args":[{"apiKey":"XXXXXX","passphrase":"ZZZZZZZ","timestamp":"1668518942","sign":"AAAAAAA"}]}
Received message: {"event":"login", "msg" : "", "code": "0"}
send:  {"op":"subscribe","args":[{"channel":"status"}]}
Received message: {"event":"subscribe","arg":{"channel":"status"}}
```

-------------

# API

## Main class: OkxV5Ws

constructor:

```javascript
class OkxV5Ws {
    constructor({
        serverBaseUrl,
        profileConfig,
        options,
        messageHandler,
    }: {
        serverBaseUrl: string // server endpoint to connect with
        profileConfig?: {
            apiKey: string // API key
            secretKey: string // secret key
            passPhrase: string // passphrase
        }
        options?: {
            autoLogin?: boolean // whether we help to auto login after connected/reconnected
            logLoginMessage?: boolean // console log for Login Response messages?
            logSubscriptionMessage?: boolean // console log for Subscription Response messages?
            logChannelTopicMessage?: boolean // console log for Channel Topic messages?
            logTradeMessage?: boolean // console log for Trade Response messages?
        }
        messageHandler?: (message: string) => any // you can pass global message handler here
    }) {
        /* ... */
    }

    /* ... */

}
```

## Methods

### Initialize the connection

```javascript
async connect()
```


### Send the payload message to server

```javascript
async send(payload: object)
```

### Subscribe to Channel topic

Notice that it would just start subscript to server side's channel. You need to add message handler by `addChannelMessageHandler` method in order to hook to your custom logic

```javascript
async subscribeChannel(subscriptionTopic: SubscriptionTopic): Promise<SubscriptionResponse>
```

### Unsubscribe to Channel topic

```javascript
async unsubscribeChannel(subscriptionTopic: SubscriptionTopic): Promise<UnsubscriptionResponse>
```

### Add Message Handler for Channel Topic

The message handler would be invoked when server push channel topic message to client.

```javascript
addChannelMessageHandler(subscriptionTopic: SubscriptionTopic, channelMessageHandler: ChannelMessageHandler)
```

### Remove Message Handler for Channel Topic

```javascript
removeChannelMessageHandler(subscriptionTopic: SubscriptionTopic, channelMessageHandler: ChannelMessageHandler) 
```

### Remove All Message Handler for Channel Topic

```javascript
removeAllChannelMessageHandler(subscriptionTopic: SubscriptionTopic)
```

### Send trade message

```javascript
async trade(payload: TradePayload): Promise<TradeResponse> 
```

### Close connection

```javascript
close()
```

-------------

# Limitation of this module

## Login, Subscribe, Unsubscribe operation are single process piped

Due to the fact that we are not able to linking some operation request and the corresponding response together, but we want to provide an user experience that close to request and response pattern. Turn out, our design is to treat these operations as one-by-one request & response pattern.

----

## Request/Response stack is not yet stable

Our design is try to use request stack to hold the requests. And when we matched response message received from server, we unstack and then response to user. So if there are bugs occurring that causing us missed the matching of response pattern, then the request in the stack would hang up.

In order to prevent this issue, you can fully use the "Free Control Style" to send/handle message by yourself. Such usage would be more stable.

----

### Only support Simple Single Login

We provide options for you to specify the API key, secret, passphrase. And we can help to do auto login after connected to server. But this is just a simple single account login. The OKX V5 websocket actually support multiple login, but we do not have this feature now.