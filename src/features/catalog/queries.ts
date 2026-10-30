import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { NftSummary } from './contracts'

export const catalogKey = ['nfts', 'list'] as const

export const catalogQuery = queryOptions({
  queryKey: catalogKey,
  queryFn: async ({ signal }) => {
    const response = await api.get<NftSummary[]>('/nfts', { signal })
    return response.data
  },
  staleTime: 30_000,
})
