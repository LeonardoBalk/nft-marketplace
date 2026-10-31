import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { authKeys } from '../auth/queries'
import type { CollectorProfile, PasswordChangeInput, ProfileInput, WalletInput, WalletSlot, WalletsResponse } from './contracts'

export const profileKey = ['account', 'profile'] as const
export const walletsKey = ['account', 'wallets'] as const

export function profileQuery() {
  return queryOptions({
    queryKey: profileKey,
    queryFn: async ({ signal }) => {
      const response = await api.get<CollectorProfile>('/profile', { signal })
      return response.data
    },
    staleTime: 30_000,
    retry: false,
  })
}

export function walletsQuery() {
  return queryOptions({
    queryKey: walletsKey,
    queryFn: async ({ signal }) => {
      const response = await api.get<WalletsResponse>('/wallets', { signal })
      return response.data
    },
    staleTime: 30_000,
    retry: false,
  })
}

export function useProfile(enabled = true) {
  return useQuery({ ...profileQuery(), enabled })
}

export function useWallets(enabled = true) {
  return useQuery({ ...walletsQuery(), enabled })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const response = await api.patch<CollectorProfile>('/profile', input)
      return response.data
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile)
      void queryClient.invalidateQueries({ queryKey: authKeys.session })
    },
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (avatarUrl: string | null) => {
      const response = await api.put<CollectorProfile>('/profile/avatar', { avatarUrl })
      return response.data
    },
    // otimista: o avatar aparece na hora e volta ao anterior se a api recusar
    onMutate: async (avatarUrl) => {
      await queryClient.cancelQueries({ queryKey: profileKey })
      const previous = queryClient.getQueryData<CollectorProfile>(profileKey)
      if (previous) queryClient.setQueryData(profileKey, { ...previous, avatarUrl })
      return { previous }
    },
    onError: (_error, _avatarUrl, context) => {
      if (context?.previous) queryClient.setQueryData(profileKey, context.previous)
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile)
      void queryClient.invalidateQueries({ queryKey: authKeys.session })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: PasswordChangeInput) => {
      await api.post('/profile/password', input)
    },
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ slot, input }: { slot: WalletSlot; input: WalletInput }) => {
      const response = await api.put<WalletsResponse>(`/wallets/${slot}`, input)
      return response.data
    },
    onSuccess: (wallets) => queryClient.setQueryData(walletsKey, wallets),
  })
}

export function useRemoveWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (slot: WalletSlot) => {
      const response = await api.delete<WalletsResponse>(`/wallets/${slot}`)
      return response.data
    },
    onSuccess: (wallets) => queryClient.setQueryData(walletsKey, wallets),
  })
}
