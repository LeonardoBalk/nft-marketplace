export interface NftSummary {
  id: string
  name: string
  priceEth: string
  available: number
  version: number
}

export interface NftUpdatedEvent {
  eventId: string
  nftId: string
  version: number
}
