import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { FavoritesResponse } from './contracts'

export const favoritesKey = ['favorites'] as const

export function favoritesQuery() {
  return queryOptions({
    queryKey: favoritesKey,
    queryFn: async ({ signal }) => {
      const response = await api.get<FavoritesResponse>('/favorites', { signal })
      return response.data
    },
    staleTime: 30_000,
    retry: false,
  })
}

export function useFavorites(enabled = true) {
  const favorites = useQuery({ ...favoritesQuery(), enabled })
  return { nftIds: favorites.data?.nftIds ?? [], isPending: favorites.isPending, isError: favorites.isError }
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, favorited }: { nftId: string; favorited: boolean }) => {
      const response = favorited
        ? await api.put<FavoritesResponse>(`/favorites/${nftId}`)
        : await api.delete<FavoritesResponse>(`/favorites/${nftId}`)
      return response.data
    },
    // otimista: o coração responde ao toque e volta ao estado anterior se a api recusar
    onMutate: async ({ nftId, favorited }) => {
      await queryClient.cancelQueries({ queryKey: favoritesKey })
      const previous = queryClient.getQueryData<FavoritesResponse>(favoritesKey)
      const nftIds = previous?.nftIds ?? []
      queryClient.setQueryData<FavoritesResponse>(favoritesKey, {
        nftIds: favorited ? [...new Set([...nftIds, nftId])] : nftIds.filter((entry) => entry !== nftId),
      })
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(favoritesKey, context.previous)
    },
    onSuccess: (favorites) => queryClient.setQueryData(favoritesKey, favorites),
  })
}
