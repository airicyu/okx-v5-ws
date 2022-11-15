const sleep = async (timeMs: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeMs)
    })
}

const checkChannelEquals = (ch1, ch2) => {
    const attributes = ['channel', 'instType', 'instFamily', 'ccy', 'instId', 'algoId']
    for (const attribute of attributes) {
        if (ch1[attribute] !== ch2[attribute]) {
            return false
        }
    }
    return true
}

const normalizeSubscriptionTopic = (subscriptionTopic: SubscriptionTopic): SubscriptionTopic => {
    return {
        channel: subscriptionTopic.channel,
        instType: (subscriptionTopic as any).instType,
        instFamily: (subscriptionTopic as any).instFamily,
        ccy: (subscriptionTopic as any).ccy,
        instId: (subscriptionTopic as any).instId,
        algoId: (subscriptionTopic as any).algoId,
    } as SubscriptionTopic
}

export { sleep, checkChannelEquals, normalizeSubscriptionTopic }
