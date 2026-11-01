import { z } from 'zod'
import { editions, type NftEdition, type NftSummary } from '../catalog/contracts'

export const cartItemRequestSchema = z.object({
  nftId: z.string().min(1),
  edition: z.enum(editions).default('1/50'),
  quantity: z.number().int().min(1).max(100),
})

export const cartQuantitySchema = z.object({
  edition: z.enum(editions).default('1/50'),
  quantity: z.number().int().min(1).max(100),
})

export const couponRequestSchema = z.object({
  code: z.string().trim().min(1).max(32),
})

export const walletNetworks = ['ethereum', 'polygon', 'solana'] as const
export const walletTypes = ['metamask', 'walletconnect', 'coinbase'] as const
// o desktop oferece a opção combinada; o frame mobile lista walletconnect à parte
export const walletProviders = ['supported', 'metamask', 'walletconnect', 'coinbase'] as const
export type WalletProvider = (typeof walletProviders)[number]
export const walletConnectionRequestSchema = z.object({ provider: z.enum(walletProviders) })
export const ensSuffixes = ['.eth', '.xyz', '.nft'] as const

export const checkoutSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(80),
  username: z.string().trim().min(2, 'Informe o nome de usuário.').max(80),
  network: z.enum(walletNetworks, 'Selecione uma rede.'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.').max(80),
  walletAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres.'),
  secondaryWallet: z.string().trim().max(120).default(''),
  walletType: z.enum(walletTypes, 'Selecione uma carteira.'),
  referralCode: z.string().trim().min(2, 'Informe o código de indicação.').max(40),
  email: z.string().trim().email('Informe um e-mail válido.'),
  ensSuffix: z.enum(ensSuffixes).default('.eth'),
  useOtherWallet: z.boolean().default(false),
  note: z.string().trim().max(500).default(''),
  walletProvider: z.enum(walletProviders, 'Selecione a carteira de pagamento.'),
})

export type CheckoutInput = z.input<typeof checkoutSchema>
export type CheckoutRequest = z.infer<typeof checkoutSchema>

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface OrderRecord {
  orderId: string
  status: OrderStatus
  version: number
  transactionHash: string | null
  createdAt: string
  updatedAt: string
  wallet: (typeof walletTypes)[number]
  network: (typeof walletNetworks)[number]
  summary: CartSummary
  declineReason?: string
}

export interface OrderReceipt extends OrderRecord {
  status: 'confirmed'
  transactionHash: string
}

export const orderUpdatedEventSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  status: z.enum(['pending', 'confirmed', 'declined']),
  version: z.number().int().min(1),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export interface CartLine {
  nft: NftSummary
  edition: NftEdition
  quantity: number
  lineTotalEth: string
}

export interface CartSummary {
  items: CartLine[]
  itemCount: number
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
}

export function cartQuoteFingerprint(cart: CartSummary): string {
  const lines = cart.items.map(({ nft, edition, quantity }) => [nft.id, edition, quantity, nft.priceEth, nft.available, nft.editionAvailability[edition], nft.version].join(':'))
  return [cart.itemCount, cart.subtotalEth, cart.discountEth, cart.networkFeeEth, cart.totalEth, cart.couponCode ?? '', ...lines].join('|')
}
