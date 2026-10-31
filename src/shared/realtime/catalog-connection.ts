import type { QueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { cartKey } from '../../features/cart/queries'
import type { NftUpdatedEvent } from '../../features/catalog/contracts'

export function connectCatalog(queryClient: QueryClient): () => void {
  const latestVersions = new Map<string, number>()
  const socket = io(window.location.origin, {
    path: '/realtime/',
    transports: ['websocket'],
    autoConnect: false,
  })

  const onNftUpdated = (event: NftUpdatedEvent) => {
    if (!event.nftId || !Number.isInteger(event.version)) return
    if (event.version <= (latestVersions.get(event.nftId) ?? 0)) return
    latestVersions.set(event.nftId, event.version)
    refresh()
  }

  // o carrinho carrega preço e disponibilidade: sem invalidar, o total fica velho
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['nfts'] })
    void queryClient.invalidateQueries({ queryKey: cartKey })
  }

  const onReconnect = () => {
    // reconciliar pelo rest: eventos podem ter se perdido enquanto estávamos fora
    latestVersions.clear()
    refresh()
  }

  socket.on('nft.updated', onNftUpdated)
  socket.on('connect', onReconnect)
  socket.connect()

  return () => {
    socket.off('nft.updated', onNftUpdated)
    socket.off('connect', onReconnect)
    socket.disconnect()
  }
}
