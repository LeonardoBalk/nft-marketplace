import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { registerRequestSchema } from './contracts'
import type { AuthSessionResponse, AuthUser, LoginInput, RegisterInput } from './contracts'
import { clearAccessToken, setAccessToken } from './session'
import { cartKey, mergeGuestCart } from '../cart/queries'

export const authKeys = {
  session: ['auth', 'session'] as const,
}

async function establishSession(path: '/auth/login' | '/auth/register', payload: LoginInput | Omit<RegisterInput, 'confirmPassword'>) {
  const { data } = await api.post<AuthSessionResponse>(path, payload)
  setAccessToken(data.accessToken)
  // manter carrinho de visitante apos autenticacao
  await mergeGuestCart()
  return data.user
}

export function useAuthSession() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      const { data } = await api.get<{ user: AuthUser }>('/auth/session')
      return data.user
    },
    staleTime: 60_000,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => establishSession('/auth/login', input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.session, user)
      void queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      establishSession('/auth/register', registerRequestSchema.parse(input)),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.session, user)
      void queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout')
      } finally {
        clearAccessToken()
      }
    },
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.session, null)
    },
  })
}
