# okx-v5-ws

This is a non-official [OKX V5 websocket](https://www.okx.com/docs-v5/) SDK for javascript.

# install

npm i okx-v5-ws

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
            options: {
                logLoginMessage: false,
                logSubscriptionMessage: false,
                logChannelTopicMessage: false,
                logTradeMessage: false,
            }
        })

        await okxV5Ws.connect()

        await okxV5Ws.subscribeChannel({
            channel: 'tickers',
            instId: 'BTC-USDT',
        })

        okxV5Ws.addChannelMessageHandler({ channel: 'tickers', instId: 'BTC-USDT' }, (message) => {
            console.log(`message handler: `, JSON.stringify(message))
        })
    } catch (e) {
        console.error(e)
    }
}
run()
```

output
```
WebSocket Client Connected
subscribe channel {"channel":"tickers","instId":"BTC-USDT"}
send:  {"op":"subscribe","args":[{"channel":"tickers","instId":"BTC-USDT"}]}
add ChannelMessageHandler for {"channel":"tickers","instId":"BTC-USDT"}
message handler:  {"arg":{"channel":"tickers","instId":"BTC-USDT"},"data":[{"instType":"SPOT","instId":"BTC-USDT","last":"16911","lastSz":"27.6688588","askPx":"16912.3","askSz":"0.0001","bidPx":"16910.5","bidSz":"43.30579595","open24h":"16641.8","high24h":"17121.3","low24h":"16035.8","sodUtc0":"16621.7","sodUtc8":"16592.1","volCcy24h":"22694273441.21289897","vol24h":"1359475.31206937","ts":"1668524928148"}]}
message handler:  {"arg":{"channel":"tickers","instId":"BTC-USDT"},"data":[{"instType":"SPOT","instId":"BTC-USDT","last":"16910.5","lastSz":"0.03735514","askPx":"16912.3","askSz":"0.0001","bidPx":"16910.5","bidSz":"43.22660886","open24h":"16641.8","high24h":"17121.3","low24h":"16035.8","sodUtc0":"16621.7","sodUtc8":"16592.1","volCcy24h":"22694274780.30618442","vol24h":"1359475.39125646","ts":"1668524928264"}]}
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

## Sample for Private Endpoint Usage

Basically similar to previous hello world. But we pass `profileConfig` values during creating `OkxV5Ws` instance.

```javascript
const run = async () => {
    try {
        const okxV5Ws = new OkxV5Ws({
            serverBaseUrl: OkxV5Ws.DEMO_PRIVATE_ENDPOINT,
            profileConfig: {
                apiKey: 'AAAAA',
                secretKey: 'BBBBB',
                passPhrase: 'CCCCCC',
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
```

output:
```
WebSocket Client Connected
send:  {"op":"login","args":[{"apiKey":"AAAAA","passphrase":"CCCCC","timestamp":"1668525060","sign":"XXXXXXX"}]}
subscribe channel {"channel":"account","ccy":"USDT"}
send:  {"op":"subscribe","args":[{"channel":"account","ccy":"USDT"}]}
add ChannelMessageHandler for {"channel":"account","ccy":"USDT"}
```

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

### Event handle

`okxV5Ws.event` is a event emitter. You can register several event handler to it.

```javascript
await okxV5Ws.event.on('message', (message: string) => {
    console.log(`Received message: ${message}`)
})
```
-------------

## Events

### message

Fire when server side push any messages.

Event handler: (message: string) => any

------

### connect

Fire when our client connected/reconnected

Event handler: () => any

------

### reconnecting

Fire when our client start to try reconnecting

Event handler: () => any

------

### close

Fire when connection close

Event handler: (code: number, desc: string) => any

------

### closed

Fire when connection close and we are not going to reconnect.
This event may trigger when user call the `close` method. Or server side close connection with code=1000.

Event handler: (code: number, desc: string) => any

------

### error

Fire when connection error happened.

Event handler: () => any

-------------

# Limitation of this module

## Login, Subscribe, Unsubscribe operation are single process piped

Due to the fact that we are not able to linking some operation request and the corresponding response together, but we want to provide an user experience that close to request and response pattern. Turn out, our design is to treat these operations as one-by-one request & response pattern.

----

## Request/Response queue is not yet stable

Our design is try to use request queue to hold the requests. And when we matched response message received from server, we lookup and then response to user. So if there are bugs occurring that causing us missed the matching of response pattern, then the request in the queue would hang up.

In order to prevent this issue, you can fully use the "Free Control Style" to send/handle message by yourself. Such usage would be more stable.

----

### Only support Simple Single Login

We provide options for you to specify the API key, secret, passphrase. And we can help to do auto login after connected to server. But this is just a simple single account login. The OKX V5 websocket actually support multiple login, but we do not have this feature now.
