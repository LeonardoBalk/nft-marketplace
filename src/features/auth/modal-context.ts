import { createContext, useContext } from 'react'

export type AuthMode = 'login' | 'register'

export interface AuthModalRequest {
  mode: AuthMode
  redirect?: string
}

export interface AuthModalContextValue {
  openAuth: (mode: AuthMode, redirect?: string) => void
  closeAuth: () => void
}

export const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) throw new Error('useAuthModal deve ser usado dentro do contexto de autenticação.')
  return context
}
