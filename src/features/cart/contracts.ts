import { z } from 'zod'
import type { NftSummary } from '../catalog/contracts'

export const cartItemRequestSchema = z.object({
  nftId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
})

export const cartQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(100),
})

export const couponRequestSchema = z.object({
  code: z.string().trim().min(1).max(32),
})

export const walletNetworks = ['ethereum', 'polygon', 'solana'] as const
export const walletTypes = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProviders = ['supported', 'metamask', 'coinbase'] as const
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

export interface OrderReceipt {
  orderId: string
  transactionHash: string
  createdAt: string
  wallet: (typeof walletTypes)[number]
  network: (typeof walletNetworks)[number]
  summary: CartSummary
}

export interface CartLine {
  nft: NftSummary
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
