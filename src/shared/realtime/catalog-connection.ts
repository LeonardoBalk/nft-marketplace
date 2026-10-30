import type { QueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
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
    void queryClient.invalidateQueries({ queryKey: ['nfts'] })
  }

  const onReconnect = () => {
    latestVersions.clear()
    void queryClient.invalidateQueries({ queryKey: ['nfts'] })
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
