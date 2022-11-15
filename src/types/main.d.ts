declare type LoginResponse = {
    event: 'login'
    code: string
    msg: string
    data?: any
}

declare type SubscriptionResponse = {
    event: 'subscribe'
    arg: SubscriptionTopic | SubscriptionTopic[]
}

declare type UnsubscriptionResponse = {
    event: 'unsubscribe'
    arg: SubscriptionTopic | SubscriptionTopic[]
}

declare type ChannelMessageHandler = (message: { arg: SubscriptionTopic; data: any }) => any

declare type HandleResponse<T> = {
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: any) => void
}

declare type OperationQueueItem = { op: string; execute: () => Promise<void> }

declare type TradePayload = {
    id?: string
    op: 'order' | 'batch-orders' | 'cancel-order' | 'batch-cancel-orders' | 'amend-order' | 'batch-amend-orders'
    [key: string]: any
}

declare type TradeResponse = {
    id: string
    op: 'order' | 'batch-orders' | 'cancel-order' | 'batch-cancel-orders' | 'amend-order' | 'batch-amend-orders'
    data: any
    code: string
    msg: string
}

// ----------------------------------------------

declare type SubscriptionTopic = PrivateSubscriptionTopic | PublicSubscriptionTopic
/**
 * Private channels
 */
declare type PrivateSubscriptionTopic =
    | AccountChannel
    | PositionsChannel
    | BalanceAndPositionChannel
    | OrderChannel
    | AlgoOrdersChannel
    | AdvanceAlgoOrdersChannel
    | PositionRiskWarningChannel
    | AccountGreeksChannel
    | SpotGridAlgoOrdersChannel
    | ContractGridAlgoOrdersChannel
    | MoonGridAlgoOrdersChannel
    | GridPositionsChannel
    | GridSubordersChannel

declare type AccountChannel = {
    channel: 'account'
    ccy?: string
}
declare type PositionsChannel = {
    channel: 'positions'
    instType: string
    instFamily?: string
    instId?: string
}
declare type BalanceAndPositionChannel = {
    channel: 'balance_and_position'
    instType: string
    instFamily?: string
    instId?: string
}
declare type OrderChannel = {
    channel: 'orders'
    instType: string
    instFamily?: string
    instId?: string
}

declare type AlgoOrdersChannel = {
    channel: 'orders-algo'
    instType: string
    instFamily?: string
    instId?: string
}
declare type AdvanceAlgoOrdersChannel = {
    channel: 'algo-advance'
    instType: string
    instId?: string
    algoId?: string
}
declare type PositionRiskWarningChannel = {
    channel: 'liquidation-warning'
    instType: string
    instFamily?: string
    instId?: string
}
declare type AccountGreeksChannel = {
    channel: 'account-greeks'
    ccy?: string
}
declare type SpotGridAlgoOrdersChannel = {
    channel: 'grid-orders-spot'
    instType: string
    instId?: string
    algoId?: string
}
declare type ContractGridAlgoOrdersChannel = {
    channel: 'grid-orders-contract'
    instType: string
    instId?: string
    algoId?: string
}
declare type MoonGridAlgoOrdersChannel = {
    channel: 'grid-orders-moon'
    instType: string
    instId?: string
    algoId?: string
}
declare type GridPositionsChannel = {
    channel: 'grid-positions'
    algoId: string
}
declare type GridSubordersChannel = {
    channel: 'grid-sub-orders'
    algoId: string
}

/**
 * Public channels
 */
declare type PublicSubscriptionTopic =
    | InstrumentsChannel
    | TickersChannel
    | OpenInterestChannel
    | CandlesticksChannel
    | TradesChannel
    | EstimatedPriceChannel
    | MarkPriceChannel
    | MarkPriceCandlesticksChannel
    | PriceLimitChannel
    | OrderBookChannel
    | OptionSummaryChannel
    | FundingRateChannel
    | IndexCandlesticksChannel
    | IndexTickersChannel
    | StatusChannel

declare type InstrumentsChannel = {
    channel: 'instruments'
    instType: string
}
declare type TickersChannel = {
    channel: 'tickers'
    instId: string
}
declare type OpenInterestChannel = {
    channel: 'open-interest'
    instId: string
}
declare type CandlesticksChannel = {
    channel: `candle${string}`
    instId: string
}
declare type TradesChannel = {
    channel: 'trades'
    instId: string
}
declare type EstimatedPriceChannel = {
    channel: 'estimated-price'
    instType: string
    instFamily?: string
    instId?: string
}
declare type MarkPriceChannel = {
    channel: 'mark-price'
    instId: string
}
declare type MarkPriceCandlesticksChannel = {
    channel: `mark-price-candle${string}`
    instId: string
}
declare type PriceLimitChannel = {
    channel: 'price-limit'
    instId: string
}
declare type OrderBookChannel = {
    channel: 'books' | 'books5' | 'books50-l2-tbt' | 'books-l2-tbt'
    instId: string
}
declare type OptionSummaryChannel = {
    channel: 'opt-summary'
    instFamily: string
}
declare type FundingRateChannel = {
    channel: 'funding-rate'
    instId: string
}
declare type IndexCandlesticksChannel = {
    channel: `index-candle${string}`
    instId: string
}
declare type IndexTickersChannel = {
    channel: 'index-tickers'
    instId: string
}
declare type StatusChannel = {
    channel: 'status'
}
