import type { QueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { orderUpdatedEventSchema, type OrderRecord } from '../../features/cart/contracts'
import { cartKey, orderKey } from '../../features/cart/queries'
import { nftUpdatedEventSchema } from '../../features/catalog/contracts'

export function connectCatalog(queryClient: QueryClient): () => void {
  const latestVersions = new Map<string, number>()
  const latestOrderVersions = new Map<string, number>()
  const socket = io(window.location.origin, {
    path: '/realtime/',
    transports: ['websocket'],
    autoConnect: false,
  })

  const onNftUpdated = (payload: unknown) => {
    const parsed = nftUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    if (event.version <= (latestVersions.get(event.nftId) ?? 0)) return
    latestVersions.set(event.nftId, event.version)
    refresh()
  }

  const onOrderUpdated = (payload: unknown) => {
    const parsed = orderUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    const key = orderKey(event.orderId)
    const current = queryClient.getQueryData<OrderRecord>(key)
    // eventos sem uma query local podem pertencer a outra sessão neste navegador
    if (!current || event.version <= Math.max(current.version, latestOrderVersions.get(event.orderId) ?? 0)) return
    latestOrderVersions.set(event.orderId, event.version)
    void queryClient.invalidateQueries({ queryKey: key })
  }

  // o carrinho carrega preço e disponibilidade: sem invalidar, o total fica velho
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['nfts'] })
    void queryClient.invalidateQueries({ queryKey: cartKey })
  }

  const onReconnect = () => {
    // reconciliar pelo rest: eventos podem ter se perdido enquanto estávamos fora
    latestVersions.clear()
    latestOrderVersions.clear()
    refresh()
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'orders' && (query.state.data as OrderRecord | undefined)?.status === 'pending',
    })
  }

  socket.on('nft.updated', onNftUpdated)
  socket.on('order.updated', onOrderUpdated)
  socket.on('connect', onReconnect)
  socket.connect()

  return () => {
    socket.off('nft.updated', onNftUpdated)
    socket.off('order.updated', onOrderUpdated)
    socket.off('connect', onReconnect)
    socket.disconnect()
  }
}
