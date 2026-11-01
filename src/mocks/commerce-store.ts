import { z } from 'zod'
import { editions, type NftEdition } from '../features/catalog/contracts'
import type { AuthUser } from '../features/auth/contracts'
import { cartQuoteFingerprint, type CartSummary, type OrderRecord, type OrderReceipt, type WalletProvider } from '../features/cart/contracts'
import { ethToWei } from '../shared/money/eth'
import { getNft } from './catalog'

const storeKey = 'kurio.demo.commerce.v1'
const storeSchema = z.object({
  carts: z.record(z.string(), z.array(z.object({ nftId: z.string(), edition: z.enum(editions).default('1/50'), quantity: z.number().int().positive() }))),
  coupons: z.record(z.string(), z.string().nullable()),
  walletConnections: z.record(z.string(), z.object({ provider: z.string(), connectionId: z.string() })).default({}),
  orders: z.record(z.string(), z.object({
    owner: z.string(),
    fingerprint: z.string(),
    receipt: z.unknown(),
    settleAt: z.string().nullable().default(null),
    outcome: z.enum(['confirmed', 'declined']).default('confirmed'),
    deliverEvents: z.boolean().default(true),
    duplicateEvents: z.boolean().default(false),
    staleEvent: z.boolean().default(false),
  })).default({}),
})
type CommerceStore = z.infer<typeof storeSchema>

function loadStore(): CommerceStore {
  try {
    const raw = localStorage.getItem(storeKey)
    const parsed = raw ? storeSchema.safeParse(JSON.parse(raw)) : null
    if (parsed?.success) return parsed.data
  } catch {
    return { carts: {}, coupons: {}, walletConnections: {}, orders: {} }
  }
  return { carts: {}, coupons: {}, walletConnections: {}, orders: {} }
}

function saveStore(store: CommerceStore): void {
  localStorage.setItem(storeKey, JSON.stringify(store))
}

export function cartOwner(user: AuthUser | null, guestId: string | null): string | null {
  if (user) return `user:${user.id}`
  return guestId && /^[a-zA-Z0-9-]{8,80}$/.test(guestId) ? `guest:${guestId}` : null
}

function formatWei(value: bigint): string {
  const whole = value / 10n ** 18n
  const fraction = (value % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function readCart(owner: string): CartSummary {
  const store = loadStore()
  const lines = (store.carts[owner] ?? []).flatMap((entry) => {
    const nft = getNft(entry.nftId)
    if (!nft) return []
    const lineTotal = ethToWei(nft.priceEth) * BigInt(entry.quantity)
    return [{ nft, edition: entry.edition, quantity: entry.quantity, lineTotalEth: formatWei(lineTotal) }]
  })
  const subtotal = lines.reduce((sum, line) => sum + ethToWei(line.nft.priceEth) * BigInt(line.quantity), 0n)
  const couponCode = store.coupons[owner] ?? null
  const discount = couponCode ? subtotal / 10n : 0n
  const networkFee = lines.length ? 5_000_000_000_000_000n : 0n
  return {
    items: lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalEth: formatWei(subtotal),
    discountEth: formatWei(discount),
    networkFeeEth: formatWei(networkFee),
    totalEth: formatWei(subtotal - discount + networkFee),
    couponCode,
  }
}

export function addCartItem(owner: string, nftId: string, quantity: number, edition: NftEdition = '1/50'): CartSummary | 'NFT_NOT_FOUND' | 'OUT_OF_STOCK' {
  const nft = getNft(nftId)
  if (!nft) return 'NFT_NOT_FOUND'
  const store = loadStore()
  const items = store.carts[owner] ?? []
  const existing = items.find((entry) => entry.nftId === nftId && entry.edition === edition)
  const nextQuantity = (existing?.quantity ?? 0) + quantity
  if (nextQuantity > nft.editionAvailability[edition] || items.filter((entry) => entry.nftId === nftId).reduce((sum, entry) => sum + entry.quantity, 0) + quantity > nft.available) return 'OUT_OF_STOCK'
  store.carts[owner] = existing
    ? items.map((entry) => entry.nftId === nftId && entry.edition === edition ? { ...entry, quantity: nextQuantity } : entry)
    : [...items, { nftId, edition, quantity }]
  saveStore(store)
  return readCart(owner)
}

export function updateCartItem(owner: string, nftId: string, quantity: number, edition: NftEdition = '1/50'): CartSummary | 'NFT_NOT_FOUND' | 'OUT_OF_STOCK' {
  const nft = getNft(nftId)
  if (!nft) return 'NFT_NOT_FOUND'
  const store = loadStore()
  const items = store.carts[owner] ?? []
  const otherQuantity = items.filter((entry) => entry.nftId === nftId && entry.edition !== edition).reduce((sum, entry) => sum + entry.quantity, 0)
  const existing = items.find((entry) => entry.nftId === nftId && entry.edition === edition)
  if (!existing) return 'NFT_NOT_FOUND'
  if (quantity > existing.quantity && (quantity > nft.editionAvailability[edition] || quantity + otherQuantity > nft.available)) return 'OUT_OF_STOCK'
  store.carts[owner] = items.map((entry) => entry.nftId === nftId && entry.edition === edition ? { ...entry, quantity } : entry)
  saveStore(store)
  return readCart(owner)
}

export function removeCartItem(owner: string, nftId: string, edition: NftEdition = '1/50'): CartSummary {
  const store = loadStore()
  store.carts[owner] = (store.carts[owner] ?? []).filter((entry) => entry.nftId !== nftId || entry.edition !== edition)
  saveStore(store)
  return readCart(owner)
}

export function applyCartCoupon(owner: string, code: string): CartSummary | 'COUPON_INVALID' | 'COUPON_EXPIRED' {
  const normalized = code.trim().toUpperCase()
  if (normalized === 'EXPIRADO') return 'COUPON_EXPIRED'
  if (normalized !== 'KURIO10') return 'COUPON_INVALID'
  const store = loadStore()
  store.coupons[owner] = normalized
  saveStore(store)
  return readCart(owner)
}

export function removeCartCoupon(owner: string): CartSummary {
  const store = loadStore()
  delete store.coupons[owner]
  saveStore(store)
  return readCart(owner)
}

export function mergeGuestCart(user: AuthUser, guestId: string | null): CartSummary {
  const owner = cartOwner(user, guestId)
  if (!owner || !guestId) return readCart(`user:${user.id}`)
  const store = loadStore()
  const guestOwner = `guest:${guestId}`
  const userItems = store.carts[owner] ?? []
  const guestItems = store.carts[guestOwner] ?? []
  for (const guestItem of guestItems) {
    const nft = getNft(guestItem.nftId)
    if (!nft) continue
    const existing = userItems.find((entry) => entry.nftId === guestItem.nftId && entry.edition === guestItem.edition)
    // Preserve guest items even when stock changed; checkout requires adjustment.
    const quantity = guestItem.quantity + (existing?.quantity ?? 0)
    if (existing) {
      const index = userItems.findIndex((entry) => entry.nftId === guestItem.nftId && entry.edition === guestItem.edition)
      userItems[index] = { ...existing, quantity }
    } else {
      userItems.push({ ...guestItem, quantity })
    }
  }
  store.carts[owner] = userItems
  delete store.carts[guestOwner]
  delete store.coupons[guestOwner]
  saveStore(store)
  return readCart(owner)
}

export interface OrderDetails {
  wallet: OrderReceipt['wallet']
  network: OrderReceipt['network']
  provider: WalletProvider
}

export function connectMockWallet(owner: string, provider: WalletProvider): string {
  const store = loadStore()
  const connectionId = crypto.randomUUID()
  store.walletConnections[owner] = { provider, connectionId }
  saveStore(store)
  return connectionId
}

export function disconnectMockWallet(owner: string): void {
  const store = loadStore()
  delete store.walletConnections[owner]
  saveStore(store)
}

export type OrderResult =
  | { status: 'created' | 'replayed'; order: OrderRecord }
  | 'CART_EMPTY'
  | 'QUOTE_CHANGED'
  | 'OUT_OF_STOCK'
  | 'WALLET_NOT_CONNECTED'
  | 'WALLET_DISCONNECTED'
  | 'IDEMPOTENCY_CONFLICT'

export function createOrder(owner: string, idempotencyKey: string, fingerprint: string, expectedQuote: string, connectionId: string, details: OrderDetails, settleAt: string, outcome: 'confirmed' | 'declined', deliverEvents = true, duplicateEvents = false, staleEvent = false, disconnectDuringCheckout = false): OrderResult {
  const store = loadStore()
  const existing = store.orders[idempotencyKey]
  if (existing) {
    if (existing.owner !== owner || existing.fingerprint !== fingerprint) return 'IDEMPOTENCY_CONFLICT'
    return { status: 'replayed', order: normalizeOrder(existing.receipt) }
  }

  if (disconnectDuringCheckout) {
    delete store.walletConnections[owner]
    saveStore(store)
    return 'WALLET_DISCONNECTED'
  }

  const summary = readCart(owner)
  if (!summary.items.length) return 'CART_EMPTY'
  const connection = store.walletConnections[owner]
  if (!connection || connection.connectionId !== connectionId || connection.provider !== details.provider) return 'WALLET_NOT_CONNECTED'
  if (cartQuoteFingerprint(summary) !== expectedQuote) return 'QUOTE_CHANGED'
  if (summary.items.some((line) => line.quantity > line.nft.editionAvailability[line.edition] || summary.items.filter((other) => other.nft.id === line.nft.id).reduce((sum, other) => sum + other.quantity, 0) > line.nft.available)) return 'OUT_OF_STOCK'

  const order: OrderRecord = {
    orderId: `KURIO-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    status: 'pending',
    version: 1,
    transactionHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wallet: details.wallet,
    network: details.network,
    summary,
  }

  store.orders[idempotencyKey] = { owner, fingerprint, receipt: order, settleAt, outcome, deliverEvents, duplicateEvents, staleEvent }
  saveStore(store)
  return { status: 'created', order }
}

function normalizeOrder(value: unknown): OrderRecord {
  const saved = value as Partial<OrderRecord> & Pick<OrderReceipt, 'orderId' | 'transactionHash' | 'createdAt' | 'wallet' | 'network' | 'summary'>
  if (saved.status) return saved as OrderRecord
  return {
    ...saved,
    status: 'confirmed',
    version: 2,
    updatedAt: saved.createdAt,
    transactionHash: saved.transactionHash,
  } as OrderRecord
}

export function getOrder(owner: string, orderId: string): OrderRecord | null {
  const store = loadStore()
  for (const entry of Object.values(store.orders)) {
    const order = normalizeOrder(entry.receipt)
    if (entry.owner === owner && order.orderId === orderId) return order
  }
  return null
}

export function getOrderByIdempotencyKey(owner: string, key: string): OrderRecord | null {
  const entry = loadStore().orders[key]
  return entry?.owner === owner ? normalizeOrder(entry.receipt) : null
}

export function pendingOrder(owner: string, orderId: string): { order: OrderRecord; settleAt: string; outcome: 'confirmed' | 'declined'; deliverEvents: boolean; duplicateEvents: boolean; staleEvent: boolean } | null {
  const store = loadStore()
  for (const entry of Object.values(store.orders)) {
    const order = normalizeOrder(entry.receipt)
    if (entry.owner === owner && order.orderId === orderId && order.status === 'pending' && entry.settleAt) {
      return { order, settleAt: entry.settleAt, outcome: entry.outcome, deliverEvents: entry.deliverEvents, duplicateEvents: entry.duplicateEvents, staleEvent: entry.staleEvent }
    }
  }
  return null
}

export function finishOrder(owner: string, orderId: string, status: 'confirmed' | 'declined', declineReason?: string): OrderRecord | null {
  const store = loadStore()
  const entry = Object.values(store.orders).find((candidate) => {
    const order = normalizeOrder(candidate.receipt)
    return candidate.owner === owner && order.orderId === orderId
  })
  if (!entry) return null
  const current = normalizeOrder(entry.receipt)
  if (current.status !== 'pending') return current

  const updated: OrderRecord = {
    ...current,
    status,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    transactionHash: status === 'confirmed' ? `0x${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 40)}` : null,
    ...(status === 'declined' && declineReason ? { declineReason } : {}),
  }

  if (status === 'confirmed') {
    const purchased = new Map(current.summary.items.map((line) => [`${line.nft.id}:${line.edition ?? '1/50'}`, line.quantity]))
    const remaining = (store.carts[owner] ?? []).flatMap((line) => {
      const quantity = line.quantity - (purchased.get(`${line.nftId}:${line.edition}`) ?? 0)
      return quantity > 0 ? [{ ...line, quantity }] : []
    })
    if (remaining.length) store.carts[owner] = remaining
    else {
      delete store.carts[owner]
      delete store.coupons[owner]
    }
  }

  entry.receipt = updated
  entry.settleAt = null
  saveStore(store)
  return updated
}

export function resolveCartOwner(user: AuthUser | null, request: Request): string | null {
  return cartOwner(user, request.headers.get('x-guest-id'))
}

export function resetCommerceStore(): void {
  localStorage.removeItem(storeKey)
}
