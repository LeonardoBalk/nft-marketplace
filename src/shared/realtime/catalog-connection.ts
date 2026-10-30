import type { QueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import type { NftUpdatedEvent } from '../../features/catalog/contracts'
import { catalogKey } from '../../features/catalog/queries'

export function connectCatalog(queryClient: QueryClient): () => void {
  const socket = io(window.location.origin, {
    path: '/realtime/',
    transports: ['websocket'],
    autoConnect: false,
  })

  const onNftUpdated = (event: NftUpdatedEvent) => {
    if (!event.nftId || !Number.isInteger(event.version)) return
    void queryClient.invalidateQueries({ queryKey: catalogKey })
  }

  const onReconnect = () => {
    void queryClient.invalidateQueries({ queryKey: catalogKey })
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
