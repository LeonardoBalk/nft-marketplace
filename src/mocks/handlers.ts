import { http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { catalogSearchSchema } from '../features/catalog/contracts'
import { cartItemRequestSchema, cartQuantitySchema, couponRequestSchema, type CartSummary } from '../features/cart/contracts'
import { addCartItem, applyCartCoupon, readCart, removeCartCoupon, removeCartItem, resolveCartOwner, updateCartItem } from './commerce-store'
import { changeNftPrice, getNft, listNfts } from './catalog'

const socketUrl = `${window.location.origin.replace(/^http/, 'ws')}/realtime/`
const nftSocket = ws.link(socketUrl)
const connectedClients = new Set<ReturnType<typeof toSocketIo>>()

function cartResponse(result: CartSummary | 'NFT_NOT_FOUND' | 'OUT_OF_STOCK' | 'COUPON_INVALID' | 'COUPON_EXPIRED') {
  if (result === 'NFT_NOT_FOUND') return HttpResponse.json({ code: 'NFT_NOT_FOUND', message: 'NFT não encontrado.' }, { status: 404 })
  if (result === 'OUT_OF_STOCK') return HttpResponse.json({ code: 'OUT_OF_STOCK', message: 'Quantidade acima do estoque disponível.' }, { status: 409 })
  if (result === 'COUPON_INVALID') return HttpResponse.json({ code: 'COUPON_INVALID', message: 'Cupom inválido.' }, { status: 422 })
  if (result === 'COUPON_EXPIRED') return HttpResponse.json({ code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' }, { status: 410 })
  return HttpResponse.json(result)
}

export const handlers = [
  http.get('/api/cart', async ({ request }) => {
    const owner = resolveCartOwner(null, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    return HttpResponse.json(readCart(owner))
  }),
  http.post('/api/cart/items', async ({ request }) => {
    const owner = resolveCartOwner(null, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = cartItemRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Item inválido.' }, { status: 422 })
    return cartResponse(addCartItem(owner, parsed.data.nftId, parsed.data.quantity))
  }),
  http.patch('/api/cart/items/:nftId', async ({ params, request }) => {
    const owner = resolveCartOwner(null, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = cartQuantitySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Quantidade inválida.' }, { status: 422 })
    return cartResponse(updateCartItem(owner, String(params.nftId), parsed.data.quantity))
  }),
  http.delete('/api/cart/items/:nftId', async ({ params, request }) => {
    const owner = resolveCartOwner(null, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    return HttpResponse.json(removeCartItem(owner, String(params.nftId)))
  }),
  http.post('/api/cart/coupon', async ({ request }) => {
    const owner = resolveCartOwner(null, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = couponRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Informe um cupom válido.' }, { status: 422 })
    return cartResponse(applyCartCoupon(owner, parsed.data.code))
  }),
  http.delete('/api/cart/coupon', async ({ request }) => {
    const owner = resolveCartOwner(null, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    return HttpResponse.json(removeCartCoupon(owner))
  }),
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
