import { delay, http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { loginSchema, registerRequestSchema } from '../features/auth/contracts'
import { authenticateMockRequest, changeMockPassword, deleteMockSession, expireMockSession, loginMockUser, registerMockUser, resetMockAuthStore, updateMockUser } from './auth-store'
import { avatarSchema, passwordChangeSchema, profileSchema, walletSchema } from '../features/account/contracts'
import { deleteWallet, readProfile, readWallets, resetAccountStore, writeAvatar, writeProfile, writeWallet } from './account-store'
import { addFavorite, readFavorites, removeFavorite, resetFavoritesStore } from './favorites-store'
import { catalogSearchSchema, editions, type NftEdition } from '../features/catalog/contracts'
import { cartItemRequestSchema, cartQuantitySchema, checkoutSchema, couponRequestSchema, walletConnectionRequestSchema, type CartSummary } from '../features/cart/contracts'
import { addCartItem, applyCartCoupon, connectMockWallet, createOrder, finishOrder, getOrder, getOrderByIdempotencyKey, mergeGuestCart, pendingOrder, readCart, removeCartCoupon, removeCartItem, resetCommerceStore, resolveCartOwner, updateCartItem } from './commerce-store'
import { changeNftAvailability, changeNftPrice, consumeNftEdition, getNft, getRelatedNfts, listNfts, resetMockCatalog } from './catalog'
import { clearDemoScenarioStorage, getDemoScenario, resetDemoScenario, takeMockNetworkBehavior, updateDemoScenario } from './demo-scenario'

function editionFromRequest(request: Request): NftEdition | null {
  const value = new URL(request.url).searchParams.get('edition')
  return value === null ? '1/50' : editions.find((edition) => edition === value) ?? null
}

const socketUrl = `${window.location.origin.replace(/^http/, 'ws')}/realtime/`
const nftSocket = ws.link(socketUrl)
const connectedClients = new Set<ReturnType<typeof toSocketIo>>()
const socketClosers = new Set<() => void>()
let socketConnectionsOpened = 0
const pendingOrderTimers = new Map<string, ReturnType<typeof setTimeout>>()

function emitNftUpdated(nftId: string, version: number) {
  const event = { eventId: crypto.randomUUID(), nftId, version }
  for (const client of connectedClients) client.client.emit('nft.updated', event)
}

function emitOrderUpdated(orderId: string, status: 'pending' | 'confirmed' | 'declined', version: number) {
  const event = { eventId: `order:${orderId}:${version}`, orderId, status, version }
  for (const client of connectedClients) client.client.emit('order.updated', event)
}

function scheduleOrderSettlement(owner: string, orderId: string) {
  const key = `${owner}:${orderId}`
  if (pendingOrderTimers.has(key)) return
  const pending = pendingOrder(owner, orderId)
  if (!pending) return
  const wait = Math.max(0, Date.parse(pending.settleAt) - Date.now())
  pendingOrderTimers.set(key, setTimeout(() => {
    pendingOrderTimers.delete(key)
    void settleOrderIfDue(owner, orderId)
  }, wait))
}

function settleOrderIfDue(owner: string, orderId: string) {
  const pending = pendingOrder(owner, orderId)
  if (!pending) return getOrder(owner, orderId)
  const remaining = Date.parse(pending.settleAt) - Date.now()
  if (remaining > 0) {
    scheduleOrderSettlement(owner, orderId)
    return pending.order
  }

  let status: 'confirmed' | 'declined' = pending.outcome
  let declineReason: string | undefined
  const changedNfts: Array<{ id: string; version: number }> = []
  if (status === 'confirmed') {
    const unavailable = pending.order.summary.items.find((line) => {
      const current = getNft(line.nft.id)
      return !current || current.editionAvailability[line.edition ?? '1/50'] < line.quantity || current.available < pending.order.summary.items.filter((other) => other.nft.id === line.nft.id).reduce((sum, other) => sum + other.quantity, 0)
    })
    if (unavailable) {
      status = 'declined'
      declineReason = 'A disponibilidade mudou durante a confirmação. Seu carrinho foi preservado.'
    } else {
      for (const line of pending.order.summary.items) {
        const current = getNft(line.nft.id)
        if (!current) continue
        const updated = consumeNftEdition(current.id, line.edition ?? '1/50', line.quantity)
        if (updated) changedNfts.push({ id: updated.id, version: updated.version })
      }
    }
  } else {
    declineReason = 'O pagamento foi recusado na simulação. Seu carrinho foi preservado.'
  }

  const order = finishOrder(owner, orderId, status, declineReason)
  if (order && order.version > pending.order.version && pending.deliverEvents) {
    emitOrderUpdated(order.orderId, order.status, order.version)
    if (pending.duplicateEvents) emitOrderUpdated(order.orderId, order.status, order.version)
    if (pending.staleEvent) emitOrderUpdated(order.orderId, 'pending', order.version - 1)
    for (const nft of changedNfts) emitNftUpdated(nft.id, nft.version)
  }
  return order
}

async function readOrderWithSettlement(owner: string, orderId: string) {
  const order = getOrder(owner, orderId)
  if (!order || order.status !== 'pending') return order
  scheduleOrderSettlement(owner, orderId)
  return settleOrderIfDue(owner, orderId)
}

function resetDemoData() {
  for (const timer of pendingOrderTimers.values()) clearTimeout(timer)
  pendingOrderTimers.clear()
  resetDemoScenario()
  resetMockAuthStore()
  resetAccountStore()
  resetFavoritesStore()
  resetCommerceStore()
  resetMockCatalog()
  clearDemoScenarioStorage()
  localStorage.removeItem('kurio.demo.access-token.v1')
  localStorage.removeItem('kurio.demo.guest-id.v1')
}

function cartResponse(result: CartSummary | 'NFT_NOT_FOUND' | 'OUT_OF_STOCK' | 'COUPON_INVALID' | 'COUPON_EXPIRED') {
  if (result === 'NFT_NOT_FOUND') return HttpResponse.json({ code: 'NFT_NOT_FOUND', message: 'NFT não encontrado.' }, { status: 404 })
  if (result === 'OUT_OF_STOCK') return HttpResponse.json({ code: 'OUT_OF_STOCK', message: 'Quantidade acima do estoque disponível.' }, { status: 409 })
  if (result === 'COUPON_INVALID') return HttpResponse.json({ code: 'COUPON_INVALID', message: 'Cupom inválido.' }, { status: 422 })
  if (result === 'COUPON_EXPIRED') return HttpResponse.json({ code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' }, { status: 410 })
  return HttpResponse.json(result)
}

export const handlers = [
  http.all('/api/*', async ({ request }) => {
    const pathname = new URL(request.url).pathname
    if (pathname.startsWith('/api/demo/')) return undefined
    const behavior = takeMockNetworkBehavior(request.method, pathname)
    if (behavior.latency) await delay(behavior.latency)
    if (!behavior.failure) return undefined
    if (behavior.failure.kind === 'offline') return HttpResponse.error()
    return HttpResponse.json(
      { code: 'DEMO_FAILURE', message: 'Falha simulada para este endpoint.' },
      { status: behavior.failure.status ?? 503 },
    )
  }),
  http.get('/api/demo/socket', () => HttpResponse.json({ connections: socketClosers.size, opened: socketConnectionsOpened })),
  http.post('/api/demo/socket/disconnect', () => {
    const connections = socketClosers.size
    for (const close of [...socketClosers]) close()
    return HttpResponse.json({ disconnected: connections })
  }),
  http.post('/api/demo/orders/:orderId/event', ({ params }) => {
    emitOrderUpdated(String(params.orderId), 'confirmed', 2)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/demo/scenario', () => HttpResponse.json(getDemoScenario())),
  http.put('/api/demo/scenario', async ({ request }) => {
    const scenario = updateDemoScenario(await request.json().catch(() => null))
    return scenario
      ? HttpResponse.json(scenario)
      : HttpResponse.json({ code: 'INVALID_SCENARIO', message: 'Cenário de demonstração inválido.' }, { status: 422 })
  }),
  http.post('/api/demo/scenario/reset', () => HttpResponse.json(resetDemoScenario())),
  http.post('/api/demo/session/expire', async ({ request }) => {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
    return await expireMockSession(token)
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json({ code: 'SESSION_NOT_FOUND', message: 'Sessão de demonstração não encontrada.' }, { status: 404 })
  }),
  http.post('/api/demo/reset', () => {
    resetDemoData()
    return HttpResponse.json({ reset: true })
  }),
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
  http.get('/api/favorites', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para ver seus favoritos.' }, { status: 401 })
    return HttpResponse.json(readFavorites(user))
  }),
  http.put('/api/favorites/:nftId', async ({ params, request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para favoritar.' }, { status: 401 })
    const nftId = String(params.nftId)
    if (!getNft(nftId)) return HttpResponse.json({ code: 'NFT_NOT_FOUND', message: 'NFT não encontrado.' }, { status: 404 })
    return HttpResponse.json(addFavorite(user, nftId))
  }),
  http.delete('/api/favorites/:nftId', async ({ params, request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para favoritar.' }, { status: 401 })
    return HttpResponse.json(removeFavorite(user, String(params.nftId)))
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
    return cartResponse(addCartItem(owner, parsed.data.nftId, parsed.data.quantity, parsed.data.edition))
  }),
  http.patch('/api/cart/items/:nftId', async ({ params, request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const parsed = cartQuantitySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Quantidade inválida.' }, { status: 422 })
    return cartResponse(updateCartItem(owner, String(params.nftId), parsed.data.quantity, parsed.data.edition))
  }),
  http.delete('/api/cart/items/:nftId', async ({ params, request }) => {
    const owner = resolveCartOwner(await authenticateMockRequest(request), request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })
    const edition = editionFromRequest(request)
    if (!edition) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Edição inválida.' }, { status: 422 })
    return HttpResponse.json(removeCartItem(owner, String(params.nftId), edition))
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
  http.post('/api/wallet/connect', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para conectar uma carteira.' }, { status: 401 })
    const parsed = walletConnectionRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'WALLET_PROVIDER_INVALID', message: 'Selecione uma carteira compatível.' }, { status: 422 })
    const outcome = getDemoScenario().walletOutcome
    if (outcome === 'refused') return HttpResponse.json({ code: 'WALLET_REFUSED', message: 'A conexão foi recusada na carteira.' }, { status: 402 })
    if (outcome === 'disconnected') return HttpResponse.json({ code: 'WALLET_DISCONNECTED', message: 'A carteira foi desconectada. Conecte novamente para continuar.' }, { status: 409 })
    const owner = resolveCartOwner(user, request)
    if (!owner) return HttpResponse.json({ code: 'WALLET_OWNER_INVALID', message: 'Não foi possível identificar a conta.' }, { status: 400 })
    const connectionId = connectMockWallet(owner, parsed.data.provider)
    return HttpResponse.json({ provider: parsed.data.provider, connectionId, status: 'connected' })
  }),
  http.post('/api/orders', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para finalizar a compra.' }, { status: 401 })
    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os dados do perfil e da carteira.' }, { status: 422 })
    const owner = resolveCartOwner(user, request)
    if (!owner) return HttpResponse.json({ code: 'CART_OWNER_INVALID', message: 'Não foi possível identificar o carrinho.' }, { status: 400 })

    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) return HttpResponse.json({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Informe uma chave de idempotência.' }, { status: 400 })
    const connectionId = request.headers.get('x-wallet-connection')

    const expectedQuote = request.headers.get('x-expected-quote')
    if (!expectedQuote) return HttpResponse.json({ code: 'QUOTE_REQUIRED', message: 'Revise o total antes de confirmar.' }, { status: 428 })
    const scenario = getDemoScenario()
    const result = createOrder(
      owner,
      idempotencyKey,
      JSON.stringify(parsed.data),
      expectedQuote,
      connectionId ?? '',
      { wallet: parsed.data.walletType, network: parsed.data.network, provider: parsed.data.walletProvider },
      new Date(Date.now() + scenario.settlementDelayMs).toISOString(),
      scenario.paymentOutcome,
      !scenario.dropOrderEvents,
      scenario.duplicateOrderEvents,
      scenario.staleOrderEvent,
      scenario.walletDisconnectDuringCheckout,
    )
    if (result === 'CART_EMPTY') return HttpResponse.json({ code: 'CART_EMPTY', message: 'Seu carrinho está vazio.' }, { status: 409 })
    if (result === 'QUOTE_CHANGED') return HttpResponse.json({ code: 'QUOTE_CHANGED', message: 'Os valores mudaram. Revise o carrinho antes de confirmar.' }, { status: 409 })
    if (result === 'OUT_OF_STOCK') return HttpResponse.json({ code: 'OUT_OF_STOCK', message: 'A quantidade disponível mudou. Revise o carrinho.' }, { status: 409 })
    if (result === 'WALLET_DISCONNECTED') return HttpResponse.json({ code: 'WALLET_DISCONNECTED', message: 'A conexão com a carteira foi interrompida. Conecte novamente para continuar.' }, { status: 409 })
    if (result === 'WALLET_NOT_CONNECTED') return HttpResponse.json({ code: 'WALLET_DISCONNECTED', message: 'Conecte a carteira selecionada para continuar.' }, { status: 409 })
    if (result === 'IDEMPOTENCY_CONFLICT') return HttpResponse.json({ code: 'IDEMPOTENCY_CONFLICT', message: 'Esta chave já foi usada para outro pedido.' }, { status: 409 })
    scheduleOrderSettlement(owner, result.order.orderId)
    if (result.status === 'created' && scenario.timeoutAfterOrderCreation) {
      return HttpResponse.json({ code: 'RESPONSE_LOST', message: 'A resposta foi interrompida após registrar o pedido. Tente novamente.' }, { status: 504 })
    }
    // repetir a mesma tentativa devolve o pedido original, sem cobrar de novo
    return HttpResponse.json(result.order, { status: result.status === 'created' ? 202 : 200 })
  }),
  http.get('/api/orders/recover', async ({ request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para ver seus pedidos.' }, { status: 401 })
    const owner = resolveCartOwner(user, request)
    const key = request.headers.get('idempotency-key') ?? ''
    const order = owner && key ? getOrderByIdempotencyKey(owner, key) : null
    return order ? HttpResponse.json(order) : HttpResponse.json({ code: 'ORDER_NOT_FOUND', message: 'Pedido não encontrado.' }, { status: 404 })
  }),
  http.get('/api/orders/:orderId', async ({ params, request }) => {
    const user = await authenticateMockRequest(request)
    if (!user) return HttpResponse.json({ code: 'SESSION_INVALID', message: 'Entre para ver seus pedidos.' }, { status: 401 })
    const owner = resolveCartOwner(user, request)
    const order = owner ? await readOrderWithSettlement(owner, String(params.orderId)) : null
    return order ? HttpResponse.json(order) : HttpResponse.json({ code: 'ORDER_NOT_FOUND', message: 'Pedido não encontrado.' }, { status: 404 })
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

    emitNftUpdated(nft.id, nft.version)

    return HttpResponse.json(nft)
  }),
  http.post('/api/demo/nfts/:nftId/availability', async ({ params, request }) => {
    const payload = await request.json().catch(() => null) as { available?: unknown } | null
    if (!payload || typeof payload.available !== 'number' || !Number.isInteger(payload.available) || payload.available < 0) {
      return HttpResponse.json({ code: 'INVALID_AVAILABILITY', message: 'Informe uma quantidade disponível válida.' }, { status: 422 })
    }
    const nft = changeNftAvailability(String(params.nftId), payload.available)
    if (!nft) return HttpResponse.json({ code: 'NFT_NOT_FOUND', message: 'NFT não encontrado.' }, { status: 404 })
    emitNftUpdated(nft.id, nft.version)
    return HttpResponse.json(nft)
  }),
  nftSocket.addEventListener('connection', (connection) => {
    const socket = toSocketIo(connection)
    connectedClients.add(socket)
    socketConnectionsOpened += 1
    const close = () => connection.client.close(1012, 'simulated interruption')
    socketClosers.add(close)
    connection.client.addEventListener('close', () => { connectedClients.delete(socket); socketClosers.delete(close) })
  }),
]
