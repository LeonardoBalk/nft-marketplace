import { http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { loginSchema, registerRequestSchema } from '../features/auth/contracts'
import { authenticateMockRequest, changeMockPassword, deleteMockSession, loginMockUser, registerMockUser, updateMockUser } from './auth-store'
import { avatarSchema, passwordChangeSchema, profileSchema, walletSchema } from '../features/account/contracts'
import { deleteWallet, readProfile, readWallets, writeAvatar, writeProfile, writeWallet } from './account-store'
import { catalogSearchSchema } from '../features/catalog/contracts'
import { cartItemRequestSchema, cartQuantitySchema, checkoutSchema, couponRequestSchema, type CartSummary } from '../features/cart/contracts'
import { addCartItem, applyCartCoupon, checkoutCart, mergeGuestCart, readCart, removeCartCoupon, removeCartItem, resolveCartOwner, updateCartItem } from './commerce-store'
import { changeNftPrice, getNft, getRelatedNfts, listNfts } from './catalog'

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
  http.post('/api/auth/register', async ({ request }) => {
    const parsed = registerRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os dados e tente novamente.' }, { status: 422 })
    const result = await registerMockUser(parsed.data)
    if (result === 'EMAIL_CONFLICT') return HttpResponse.json({ code: 'EMAIL_CONFLICT', message: 'Já existe uma conta com este e-mail.' }, { status: 409 })
    return HttpResponse.json(result, { status: 201 })
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const parsed = loginSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'E-mail ou senha inválidos.' }, { status: 422 })
    const result = await loginMockUser(parsed.data)
    if (result === 'INVALID_CREDENTIALS') return HttpResponse.json({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' }, { status: 401 })
    return HttpResponse.json(result)
  }),
  http.get('/api/auth/session', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    return user ? HttpResponse.json({ user }) : HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
  }),
  http.post('/api/auth/logout', async ({ request }) => {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
    await deleteMockSession(token)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/profile', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    return HttpResponse.json(readProfile(user))
  }),
  http.patch('/api/profile', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    const parsed = profileSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os dados do perfil.' }, { status: 422 })
    const updated = await updateMockUser(user.id, { name: parsed.data.displayName, email: parsed.data.email })
    if (updated === 'EMAIL_CONFLICT') return HttpResponse.json({ code: 'EMAIL_CONFLICT', message: 'Já existe uma conta com este e-mail.' }, { status: 409 })
    return HttpResponse.json(writeProfile(user, parsed.data))
  }),
  http.put('/api/profile/avatar', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    const parsed = avatarSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Imagem inválida.' }, { status: 422 })
    await updateMockUser(user.id, { avatarUrl: parsed.data.avatarUrl })
    return HttpResponse.json(writeAvatar(user, parsed.data.avatarUrl))
  }),
  http.post('/api/profile/password', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira as senhas informadas.' }, { status: 422 })
    const result = await changeMockPassword(user.id, parsed.data.currentPassword, parsed.data.newPassword)
    if (result === 'INVALID_PASSWORD') return HttpResponse.json({ code: 'INVALID_PASSWORD', message: 'A senha atual não confere.' }, { status: 422 })
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/wallets', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    return HttpResponse.json(readWallets(user))
  }),
  http.put('/api/wallets/:slot', async ({ params, request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    const slot = String(params.slot)
    if (slot !== 'primary' && slot !== 'secondary') return HttpResponse.json({ code: 'WALLET_SLOT_INVALID', message: 'Carteira inválida.' }, { status: 404 })
    const parsed = walletSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os dados da carteira.' }, { status: 422 })
    return HttpResponse.json(writeWallet(user, slot, parsed.data))
  }),
  http.delete('/api/wallets/:slot', async ({ params, request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Sua sessão expirou.' }, { status: 401 })
    const slot = String(params.slot)
    if (slot !== 'primary' && slot !== 'secondary') return HttpResponse.json({ code: 'WALLET_SLOT_INVALID', message: 'Carteira inválida.' }, { status: 404 })
    return HttpResponse.json(deleteWallet(user, slot))
  }),
  http.get('/api/cart', async ({ request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    return HttpResponse.json(readCart(owner))
  }),
  http.post('/api/cart/items', async ({ request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = cartItemRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Item inválido.' }, { status: 422 })
    return cartResponse(addCartItem(owner, parsed.data.nftId, parsed.data.quantity))
  }),
  http.patch('/api/cart/items/:nftId', async ({ params, request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = cartQuantitySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Quantidade inválida.' }, { status: 422 })
    return cartResponse(updateCartItem(owner, String(params.nftId), parsed.data.quantity))
  }),
  http.delete('/api/cart/items/:nftId', async ({ params, request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    return HttpResponse.json(removeCartItem(owner, String(params.nftId)))
  }),
  http.post('/api/cart/coupon', async ({ request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = couponRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Informe um cupom válido.' }, { status: 422 })
    return cartResponse(applyCartCoupon(owner, parsed.data.code))
  }),
  http.delete('/api/cart/coupon', async ({ request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    return HttpResponse.json(removeCartCoupon(owner))
  }),
  http.post('/api/cart/merge', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para continuar.' }, { status: 401 })
    return HttpResponse.json(mergeGuestCart(user, request.headers.get('x-guest-id')))
  }),
  http.post('/api/orders', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para finalizar a compra.' }, { status: 401 })
    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os dados do perfil e da carteira.' }, { status: 422 })
    const owner = resolveCartOwner(user, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const result = checkoutCart(owner)
    if (result === 'CART_EMPTY') return HttpResponse.json({ code: 'CART_EMPTY', message: 'Seu carrinho está vazio.' }, { status: 409 })
    // recibo preserva snapshot do pedido
    return HttpResponse.json({
      ...result,
      transactionHash: `0x${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 40)}`,
      createdAt: new Date().toISOString(),
      wallet: parsed.data.walletType,
      network: parsed.data.network,
    }, { status: 201 })
  }),
  http.get('/api/nfts', ({ request }) => {
    const params = Object.fromEntries(new URL(request.url).searchParams)
    return HttpResponse.json(listNfts(catalogSearchSchema.parse(params)))
  }),
  http.get('/api/nfts/:nftId/related', ({ params }) => {
    const nft = getNft(String(params.nftId))
    return nft ? HttpResponse.json({ items: getRelatedNfts(nft.id) }) : HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })
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
