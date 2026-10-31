import { z } from 'zod'
import { ensSuffixes, walletNetworks, walletTypes } from '../cart/contracts'

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(80),
  username: z.string().trim().min(2, 'Informe o nome de usuário.').max(80),
  email: z.string().trim().email('Informe um e-mail válido.'),
  ensSuffix: z.enum(ensSuffixes).default('.eth'),
  ensName: z.string().trim().max(60).default(''),
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira.').max(60),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8, 'Informe a senha atual.'),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não conferem.',
})

export const avatarSchema = z.object({
  avatarUrl: z.string().max(400_000).nullable(),
})

export const walletSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(80),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira.').max(60),
  network: z.enum(walletNetworks, 'Selecione uma rede.'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.').max(80),
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres.'),
  secondaryAddress: z.string().trim().max(120).default(''),
  type: z.enum(walletTypes, 'Selecione uma carteira.'),
  referralCode: z.string().trim().min(2, 'Informe o código de indicação.').max(40),
  email: z.string().trim().email('Informe um e-mail válido.'),
  ensSuffix: z.enum(ensSuffixes).default('.eth'),
  ensName: z.string().trim().max(60).default(''),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
export type WalletInput = z.infer<typeof walletSchema>
export type WalletSlot = 'primary' | 'secondary'

export interface CollectorProfile extends ProfileInput {
  avatarUrl: string | null
}

export interface CollectorWallet extends WalletInput {
  slot: WalletSlot
}

export interface WalletsResponse {
  primary: CollectorWallet | null
  secondary: CollectorWallet | null
}
