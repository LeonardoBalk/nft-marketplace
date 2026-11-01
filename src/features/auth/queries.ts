import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { registerRequestSchema } from './contracts'
import type { AuthSessionResponse, AuthUser, LoginInput, RegisterInput } from './contracts'
import { clearAccessToken, setAccessToken } from './session'
import { cartKey, mergeGuestCart } from '../cart/queries'
import { favoritesKey } from '../favorites/queries'

export const authKeys = {
  session: ['auth', 'session'] as const,
}

async function establishSession(path: '/auth/login' | '/auth/register', payload: LoginInput | Omit<RegisterInput, 'confirmPassword'>) {
  const { data } = await api.post<AuthSessionResponse>(path, payload)
  setAccessToken(data.accessToken)
  window.dispatchEvent(new Event('kurio:session-restored'))
  // manter carrinho de visitante apos autenticacao
  try {
    await mergeGuestCart()
    sessionStorage.removeItem('kurio.cart.merge-pending.v1')
  } catch {
    sessionStorage.setItem('kurio.cart.merge-pending.v1', '1')
    window.dispatchEvent(new Event('kurio:cart-merge-failed'))
  }
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
      void queryClient.invalidateQueries({ queryKey: favoritesKey })
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
      void queryClient.invalidateQueries({ queryKey: favoritesKey })
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
        window.dispatchEvent(new Event('kurio:session-ended'))
      }
    },
    // sessão nula primeiro: clear() tiraria a consulta de baixo de quem está na tela e o header seguiria logado
    onSettled: async () => {
      queryClient.setQueryData(authKeys.session, null)
      // o resto era da conta que saiu: volta ao zero e o que está na tela refaz a busca como visitante
      await queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== authKeys.session[0] })
    },
  })
}
