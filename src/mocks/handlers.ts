import { http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { catalogSearchSchema } from '../features/catalog/contracts'
import { changeNftPrice, getNft, listNfts } from './catalog'

const socketUrl = `${window.location.origin.replace(/^http/, 'ws')}/realtime/`
const nftSocket = ws.link(socketUrl)
const connectedClients = new Set<ReturnType<typeof toSocketIo>>()

export const handlers = [
  http.get('/api/nfts', ({ request }) => {
    const params = Object.fromEntries(new URL(request.url).searchParams)
    return HttpResponse.json(listNfts(catalogSearchSchema.parse(params)))
  }),
  http.get('/api/nfts/:nftId', ({ params }) => {
    const nft = getNft(String(params.nftId))
    return nft ? HttpResponse.json(nft) : HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })
  }),
  http.post('/api/demo/nfts/:nftId/price', async ({ params, request }) => {
    const payload = (await request.json()) as { priceEth?: string }
    if (typeof payload.priceEth !== 'string' || !/^\d+(?:\.\d{1,18})?$/.test(payload.priceEth)) {
      return HttpResponse.json({ code: 'INVALID_PRICE' }, { status: 422 })
    }

    const nft = changeNftPrice(String(params.nftId), payload.priceEth)
    if (!nft) return HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })

    for (const client of connectedClients) {
      client.client.emit('nft.updated', {
        eventId: crypto.randomUUID(),
        nftId: nft.id,
        version: nft.version,
      })
    }

    return HttpResponse.json(nft)
  }),
  nftSocket.addEventListener('connection', (connection) => {
    const socket = toSocketIo(connection)
    connectedClients.add(socket)
    connection.client.addEventListener('close', () => connectedClients.delete(socket))
  }),
]
