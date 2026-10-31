import { z } from 'zod'
import type { AuthUser } from '../features/auth/contracts'
import type { CollectorProfile, CollectorWallet, ProfileInput, WalletInput, WalletSlot, WalletsResponse } from '../features/account/contracts'

const storeKey = 'kurio.demo.account.v1'
const walletRecordSchema = z.object({
  displayName: z.string(),
  nickname: z.string(),
  network: z.enum(['ethereum', 'polygon', 'solana']),
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string(),
  type: z.enum(['metamask', 'walletconnect', 'coinbase']),
  referralCode: z.string(),
  email: z.string(),
  ensSuffix: z.enum(['.eth', '.xyz', '.nft']),
  ensName: z.string(),
})
const storeSchema = z.object({
  profiles: z.record(z.string(), z.object({
    displayName: z.string(),
    username: z.string(),
    email: z.string(),
    ensSuffix: z.enum(['.eth', '.xyz', '.nft']),
    ensName: z.string(),
    walletNickname: z.string(),
    avatarUrl: z.string().nullable(),
  })),
  wallets: z.record(z.string(), z.object({
    primary: walletRecordSchema.nullable(),
    secondary: walletRecordSchema.nullable(),
  })),
})
type AccountStore = z.infer<typeof storeSchema>

function loadStore(): AccountStore {
  try {
    const raw = localStorage.getItem(storeKey)
    const parsed = raw ? storeSchema.safeParse(JSON.parse(raw)) : null
    if (parsed?.success) return parsed.data
  } catch {
    return { profiles: {}, wallets: {} }
  }
  return { profiles: {}, wallets: {} }
}

function saveStore(store: AccountStore): void {
  localStorage.setItem(storeKey, JSON.stringify(store))
}

export function readProfile(user: AuthUser): CollectorProfile {
  const store = loadStore()
  const stored = store.profiles[user.id]
  if (stored) return stored
  // o perfil nasce preenchido com o que a conta já conhece
  return {
    displayName: user.name,
    username: user.email.split('@')[0],
    email: user.email,
    ensSuffix: '.eth',
    ensName: '',
    walletNickname: 'Carteira principal',
    avatarUrl: user.avatarUrl,
  }
}

export function writeProfile(user: AuthUser, input: ProfileInput): CollectorProfile {
  const store = loadStore()
  const next: CollectorProfile = { ...readProfile(user), ...input }
  store.profiles[user.id] = next
  saveStore(store)
  return next
}

export function writeAvatar(user: AuthUser, avatarUrl: string | null): CollectorProfile {
  const store = loadStore()
  const next: CollectorProfile = { ...readProfile(user), avatarUrl }
  store.profiles[user.id] = next
  saveStore(store)
  return next
}

export function readWallets(user: AuthUser): WalletsResponse {
  const store = loadStore()
  const stored = store.wallets[user.id]
  return {
    primary: stored?.primary ? { ...stored.primary, slot: 'primary' } : null,
    secondary: stored?.secondary ? { ...stored.secondary, slot: 'secondary' } : null,
  }
}

export function writeWallet(user: AuthUser, slot: WalletSlot, input: WalletInput): WalletsResponse {
  const store = loadStore()
  const current = store.wallets[user.id] ?? { primary: null, secondary: null }
  store.wallets[user.id] = { ...current, [slot]: input }
  saveStore(store)
  return readWallets(user)
}

export function deleteWallet(user: AuthUser, slot: WalletSlot): WalletsResponse {
  const store = loadStore()
  const current = store.wallets[user.id] ?? { primary: null, secondary: null }
  store.wallets[user.id] = { ...current, [slot]: null }
  saveStore(store)
  return readWallets(user)
}

export function collectorWalletToCheckoutDefaults(wallet: CollectorWallet | null) {
  if (!wallet) return null
  return {
    network: wallet.network,
    walletAddress: wallet.address,
    secondaryWallet: wallet.secondaryAddress,
    walletType: wallet.type,
    referralCode: wallet.referralCode,
    email: wallet.email,
    profileName: wallet.profileName,
    displayName: wallet.displayName,
  }
}
