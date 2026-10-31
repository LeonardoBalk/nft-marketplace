import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})

export const registerRequestSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(80),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.'),
})

export const registerSchema = registerRequestSchema.extend({
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não conferem.',
})

export const authSearchSchema = z.object({
  mode: z.enum(['login', 'register']).catch('login').default('login'),
  redirect: z.string().max(200).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface AuthSessionResponse {
  accessToken: string
  user: AuthUser
  expiresAt: string
}
