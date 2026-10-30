import { z } from 'zod'

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).catch('').default(''),
  category: z.string().catch('').default(''),
  network: z.enum(['', 'ethereum', 'polygon', 'solana']).catch('').default(''),
  minPrice: z.string().regex(/^(?:\d+(?:\.\d{1,18})?)?$/).catch('').default(''),
  maxPrice: z.string().regex(/^(?:\d+(?:\.\d{1,18})?)?$/).catch('').default(''),
  sort: z.enum(['recent', 'price-asc', 'price-desc']).catch('recent').default('recent'),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>
export const defaultCatalogSearch: CatalogSearch = catalogSearchSchema.parse({})
export type NftNetwork = 'ethereum' | 'polygon' | 'solana'

export interface CatalogFacets {
  categories: Array<{ name: string; count: number }>
  networks: Array<{ value: NftNetwork; label: string; count: number }>
}

export interface NftSummary {
  id: string
  name: string
  collection: string
  category: string
  network: NftNetwork
  artwork: string
  priceEth: string
  oldPriceEth?: string
  available: number
  edition: number
  version: number
}

export interface NftPage {
  items: NftSummary[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  facets: CatalogFacets
}

export interface NftUpdatedEvent {
  eventId: string
  nftId: string
  version: number
}
