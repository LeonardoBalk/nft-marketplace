import type { NftEdition } from '../catalog/contracts'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '../../shared/api/client'
import { rotateGuestId } from '../auth/session'
import type { CartSummary, CheckoutRequest, OrderRecord } from './contracts'

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
    mutationFn: async ({ nftId, quantity, edition = '1/50' }: { nftId: string; quantity: number; edition?: NftEdition }) => {
      const response = await api.post<CartSummary>('/cart/items', { nftId, quantity, edition })
      return response.data
    },
    onSuccess: (summary) => queryClient.setQueryData(cartKey, summary),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, quantity, edition = '1/50' }: { nftId: string; quantity: number; edition?: NftEdition }) => {
      const response = await api.patch<CartSummary>(`/cart/items/${nftId}`, { quantity, edition })
      return response.data
    },
    onSuccess: (summary) => queryClient.setQueryData(cartKey, summary),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: string | { nftId: string; edition: NftEdition }) => {
      const nftId = typeof item === 'string' ? item : item.nftId
      const edition = typeof item === 'string' ? '1/50' : item.edition
      const response = await api.delete<CartSummary>(`/cart/items/${nftId}`, { params: { edition } })
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

export function useConnectWallet() {
  return useMutation({
    mutationFn: async (provider: string) => {
      const response = await api.post<{ provider: string; connectionId: string; status: 'connected' }>('/wallet/connect', { provider })
      return response.data
    },
  })
}

export function useCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    // chave vem de fora e sobrevive à retentativa: clique repetido não duplica pedido
    mutationFn: async ({ input, idempotencyKey, expectedQuote, connectionId }: { input: CheckoutRequest; idempotencyKey: string; expectedQuote: string; connectionId: string }) => {
      const request = () => api.post<OrderRecord>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey, 'X-Expected-Quote': expectedQuote, 'X-Wallet-Connection': connectionId } })
      try {
        return (await request()).data
      } catch (error) {
        // repetir com a mesma chave recupera o pedido sem duplicar a compra
        if (isAxiosError(error) && (error.response?.status === 504 || !error.response)) {
          return (await request()).data
        }
        throw error
      }
    },
    // o pedido pendente entra no cache; o status final chega por realtime e pelo polling
    onSuccess: (order) => {
      queryClient.setQueryData(orderKey(order.orderId), order)
      return queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })
}

export const orderKey = (orderId: string) => ['orders', orderId] as const

export async function recoverOrder(key: string): Promise<OrderRecord> {
  const { data } = await api.get<OrderRecord>('/orders/recover', { headers: { 'Idempotency-Key': key } })
  return data
}

// a confirmação é uma página: refresh ou link direto recuperam o pedido pela api
export function orderQuery(orderId: string) {
  return queryOptions({
    queryKey: orderKey(orderId),
    queryFn: async ({ signal }) => {
      const response = await api.get<OrderRecord>(`/orders/${orderId}`, { signal })
      return response.data
    },
    staleTime: 0,
    refetchInterval: (query) => query.state.data?.status === 'pending' ? 500 : false,
    refetchIntervalInBackground: true,
    retry: 2,
  })
}

export async function mergeGuestCart(): Promise<CartSummary> {
  const response = await api.post<CartSummary>('/cart/merge')
  // preservar a identidade visitante se a união falhar
  rotateGuestId()
  return response.data
}
