import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { rotateGuestId } from '../auth/session'
import type { CartSummary, CheckoutRequest, OrderReceipt } from './contracts'

export const cartKey = ['cart'] as const

export function cartQuery() {
  return queryOptions({
    queryKey: cartKey,
    queryFn: async ({ signal }) => {
      const response = await api.get<CartSummary>('/cart', { signal })
      return response.data
    },
    staleTime: 10_000,
  })
}

export function useCart() {
  const cart = useQuery(cartQuery())
  return { cart: cart.data, itemCount: cart.data?.itemCount ?? 0, isPending: cart.isPending, isError: cart.isError }
}

export function useAddCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, quantity }: { nftId: string; quantity: number }) => {
      const response = await api.post<CartSummary>('/cart/items', { nftId, quantity })
      return response.data
    },
    onSuccess: (summary) => queryClient.setQueryData(cartKey, summary),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, quantity }: { nftId: string; quantity: number }) => {
      const response = await api.patch<CartSummary>(`/cart/items/${nftId}`, { quantity })
      return response.data
    },
    onSuccess: (summary) => queryClient.setQueryData(cartKey, summary),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nftId: string) => {
      const response = await api.delete<CartSummary>(`/cart/items/${nftId}`)
      return response.data
    },
    onSuccess: (summary) => queryClient.setQueryData(cartKey, summary),
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post<CartSummary>('/cart/coupon', { code })
      return response.data
    },
    onSuccess: (summary) => queryClient.setQueryData(cartKey, summary),
  })
}

export function useCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    // chave vem de fora e sobrevive à retentativa: clique repetido não duplica pedido
    mutationFn: async ({ input, idempotencyKey }: { input: CheckoutRequest; idempotencyKey: string }) => {
      const response = await api.post<OrderReceipt>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKey }),
  })
}

export async function mergeGuestCart(): Promise<CartSummary | null> {
  try {
    const response = await api.post<CartSummary>('/cart/merge')
    // limpar identidade de visitante apos mesclar carrinho
    rotateGuestId()
    return response.data
  } catch {
    return null
  }
}
