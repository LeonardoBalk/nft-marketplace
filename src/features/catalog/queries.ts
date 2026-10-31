import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { isAxiosError } from 'axios'
import type { CatalogSearch, NftPage, NftSummary } from './contracts'

export const catalogKey = ['nfts', 'list', 2] as const

export const nftKey = (nftId: string) => ['nfts', 'detail', nftId] as const

export const relatedNftsKey = (nftId: string) => ['nfts', 'related', nftId] as const

export function catalogQuery(search: CatalogSearch) {
  return queryOptions({
    queryKey: [...catalogKey, search],
    queryFn: async ({ signal }) => {
      const response = await api.get<NftPage>('/nfts', { params: search, signal })
      return response.data
    },
    staleTime: 30_000,
    retry: (failureCount, error) => !(isAxiosError(error) && error.response?.status === 404) && failureCount < 2,
  })
}

export function nftQuery(nftId: string) {
  return queryOptions({
    queryKey: nftKey(nftId),
    queryFn: async ({ signal }) => {
      const response = await api.get<NftSummary>(`/nfts/${nftId}`, { signal })
      return response.data
    },
    staleTime: 30_000,
    retry: (failureCount, error) => !(isAxiosError(error) && error.response?.status === 404) && failureCount < 2,
  })
}

export function relatedNftsQuery(nftId: string) {
  return queryOptions({
    queryKey: relatedNftsKey(nftId),
    queryFn: async ({ signal }) => {
      const response = await api.get<{ items: NftSummary[] }>(`/nfts/${nftId}/related`, { signal })
      return response.data.items
    },
    staleTime: 30_000,
    retry: (failureCount, error) => !(isAxiosError(error) && error.response?.status === 404) && failureCount < 2,
  })
}
