import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useLogout } from '../features/auth/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'

const privatePaths = ['/perfil', '/carteiras', '/favoritos']

// sair numa tela privada leva para a inicial: a rota exige sessão e ficaria vazia
export function useSignOut() {
  const logout = useLogout()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // navega antes de deslogar: o menu do header desmonta quando a sessão some e perderia um callback,
  // e a tela privada, ainda montada, refaria as consultas sem sessão e piscaria erro
  const signOut = () => {
    if (privatePaths.includes(pathname)) void navigate({ to: '/', search: defaultCatalogSearch })
    logout.mutate()
  }

  return { signOut, isPending: logout.isPending }
}
