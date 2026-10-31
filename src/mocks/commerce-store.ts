import { z } from 'zod'
import type { AuthUser } from '../features/auth/contracts'
import type { CartSummary, OrderReceipt } from '../features/cart/contracts'
import { ethToWei } from '../shared/money/eth'
import { getNft } from './catalog'

const storeKey = 'kurio.demo.commerce.v1'
const storeSchema = z.object({
  carts: z.record(z.string(), z.array(z.object({ nftId: z.string(), quantity: z.number().int().positive() }))),
  coupons: z.record(z.string(), z.string().nullable()),
  orders: z.record(z.string(), z.object({
    owner: z.string(),
    fingerprint: z.string(),
    receipt: z.unknown(),
  })).default({}),
})
type CommerceStore = z.infer<typeof storeSchema>

function loadStore(): CommerceStore {
  try {
    const raw = localStorage.getItem(storeKey)
    const parsed = raw ? storeSchema.safeParse(JSON.parse(raw)) : null
    if (parsed?.success) return parsed.data
  } catch {
    return { carts: {}, coupons: {}, orders: {} }
  }
  return { carts: {}, coupons: {}, orders: {} }
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
  const fraction = (value % 10n ** 18n).toString().padStart(18, '0').slice(0, 6).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function readCart(owner: string): CartSummary {
  const store = loadStore()
  const lines = (store.carts[owner] ?? []).flatMap((entry) => {
    const nft = getNft(entry.nftId)
    if (!nft) return []
    const lineTotal = ethToWei(nft.priceEth) * BigInt(entry.quantity)
    return [{ nft, quantity: entry.quantity, lineTotalEth: formatWei(lineTotal) }]
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

export function addCartItem(owner: string, nftId: string, quantity: number): CartSummary | 'NFT_NOT_FOUND' | 'OUT_OF_STOCK' {
  const nft = getNft(nftId)
  if (!nft) return 'NFT_NOT_FOUND'
  const store = loadStore()
  const items = store.carts[owner] ?? []
  const existing = items.find((entry) => entry.nftId === nftId)
  const nextQuantity = (existing?.quantity ?? 0) + quantity
  if (nextQuantity > nft.available) return 'OUT_OF_STOCK'
  store.carts[owner] = existing
    ? items.map((entry) => entry.nftId === nftId ? { ...entry, quantity: nextQuantity } : entry)
    : [...items, { nftId, quantity }]
  saveStore(store)
  return readCart(owner)
}

export function updateCartItem(owner: string, nftId: string, quantity: number): CartSummary | 'NFT_NOT_FOUND' | 'OUT_OF_STOCK' {
  const nft = getNft(nftId)
  if (!nft) return 'NFT_NOT_FOUND'
  if (quantity > nft.available) return 'OUT_OF_STOCK'
  const store = loadStore()
  const items = store.carts[owner] ?? []
  if (!items.some((entry) => entry.nftId === nftId)) return 'NFT_NOT_FOUND'
  store.carts[owner] = items.map((entry) => entry.nftId === nftId ? { ...entry, quantity } : entry)
  saveStore(store)
  return readCart(owner)
}

export function removeCartItem(owner: string, nftId: string): CartSummary {
  const store = loadStore()
  store.carts[owner] = (store.carts[owner] ?? []).filter((entry) => entry.nftId !== nftId)
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
    const existing = userItems.find((entry) => entry.nftId === guestItem.nftId)
    const quantity = Math.min(nft.available, guestItem.quantity + (existing?.quantity ?? 0))
    if (existing) {
      const index = userItems.findIndex((entry) => entry.nftId === guestItem.nftId)
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
}

export type OrderResult =
  | { status: 'created' | 'replayed'; receipt: OrderReceipt }
  | 'CART_EMPTY'
  | 'IDEMPOTENCY_CONFLICT'

// mesma chave recupera o mesmo pedido; chave reutilizada com outro conteúdo é conflito
export function createOrder(owner: string, idempotencyKey: string, fingerprint: string, details: OrderDetails): OrderResult {
  const store = loadStore()
  const existing = store.orders[idempotencyKey]
  if (existing) {
    if (existing.owner !== owner || existing.fingerprint !== fingerprint) return 'IDEMPOTENCY_CONFLICT'
    return { status: 'replayed', receipt: existing.receipt as OrderReceipt }
  }

  const summary = readCart(owner)
  if (!summary.items.length) return 'CART_EMPTY'

  const receipt: OrderReceipt = {
    orderId: `KURIO-${Date.now().toString(36).toUpperCase()}`,
    transactionHash: `0x${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 40)}`,
    createdAt: new Date().toISOString(),
    wallet: details.wallet,
    network: details.network,
    // snapshot: mudança posterior no catálogo não altera o recibo
    summary,
  }

  delete store.carts[owner]
  delete store.coupons[owner]
  store.orders[idempotencyKey] = { owner, fingerprint, receipt }
  saveStore(store)
  return { status: 'created', receipt }
}

export function getOrder(owner: string, orderId: string): OrderReceipt | null {
  const store = loadStore()
  for (const entry of Object.values(store.orders)) {
    const receipt = entry.receipt as OrderReceipt
    if (entry.owner === owner && receipt.orderId === orderId) return receipt
  }
  return null
}

export function resolveCartOwner(user: AuthUser | null, request: Request): string | null {
  return cartOwner(user, request.headers.get('x-guest-id'))
}
