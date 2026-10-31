import { useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CatalogPage } from './catalog-page'
import { useAuthModal } from '../features/auth/modal-context'

// /entrar: modal com a inicial ao fundo, para onde o router manda quem não tem sessão
export function AuthGatePage() {
  const { mode, redirect } = useSearch({ from: '/entrar' })
  const { openAuth } = useAuthModal()

  useEffect(() => {
    openAuth(mode, redirect)
  }, [mode, redirect, openAuth])

  return <CatalogPage />
}
