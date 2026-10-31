import { createRootRoute, createRoute, createRouter, Outlet, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { CatalogPage } from './catalog-page'
import { NftDetailPage } from './nft-detail-page'
import { CartPage } from './cart-page'
import { FavoritesPage } from './favorites-page'
import { ProfilePage } from './profile-page'
import { WalletsPage } from './wallets-page'
import { CheckoutPage } from './checkout-page'
import { SiteHeader } from './site-header'
import { MobileTabBar, hidesMobileNav } from './mobile-tab-bar'
import { AuthPage } from './auth-page'
import { AuthGatePage } from './auth-gate-page'
import { authSearchSchema } from '../features/auth/contracts'
import { AuthModalContext, type AuthModalRequest } from '../features/auth/modal-context'
import { getAccessToken } from '../features/auth/session'
import { catalogSearchSchema, defaultCatalogSearch } from '../features/catalog/contracts'
import { favoritesSearchSchema } from '../features/favorites/contracts'

// barra o fluxo privado antes de montar a tela e guarda o destino para retomar
function requireSession({ location }: { location: { href: string } }) {
  if (!getAccessToken()) throw redirect({ to: '/entrar', search: { mode: 'login' as const, redirect: location.href } })
}

function RootLayout() {
  const [authModal, setAuthModal] = useState<AuthModalRequest | null>(null)
  const navigate = useNavigate()
  const onAuthRoute = useRouterState({ select: (state) => state.location.pathname === '/entrar' })
  const hideMobileNav = useRouterState({ select: (state) => hidesMobileNav(state.location.pathname) })
  const closeAuth = useCallback(() => {
    setAuthModal(null)
    // /entrar só existe para o modal: fechar lá tem que devolver para a inicial
    if (onAuthRoute) void navigate({ to: '/', search: defaultCatalogSearch })
  }, [onAuthRoute, navigate])
  const openAuth = useCallback((mode: AuthModalRequest['mode'], redirect?: string) => setAuthModal({ mode, redirect }), [])
  const authModalContext = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth])

  return <AuthModalContext.Provider value={authModalContext}>
    <SiteHeader />
    <Outlet />
    {/* folga para o conteúdo não terminar embaixo da tab bar fixa */}
    {!hideMobileNav && <div aria-hidden="true" className="h-[calc(136px+env(safe-area-inset-bottom))] md:hidden" />}
    <MobileTabBar />
    {authModal && <AuthPage key={authModal.mode} mode={authModal.mode} redirect={authModal.redirect} onClose={closeAuth} />}
  </AuthModalContext.Provider>
}

function NotFound() {
  return <main className="mx-auto max-w-5xl px-5 py-24"><h1 className="text-3xl">Página não encontrada</h1><p className="mt-4 text-[#bca594]">Confira o endereço e tente novamente.</p></main>
}

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFound })
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CatalogPage,
  validateSearch: (search) => catalogSearchSchema.parse(search),
})

const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: NftDetailPage,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: CartPage,
})

const authGateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  component: AuthGatePage,
  validateSearch: (search) => authSearchSchema.parse(search),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  component: ProfilePage,
  beforeLoad: requireSession,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  component: WalletsPage,
  beforeLoad: requireSession,
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favoritos',
  component: FavoritesPage,
  beforeLoad: requireSession,
  validateSearch: (search) => favoritesSearchSchema.parse(search),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
})

export const router = createRouter({ routeTree: rootRoute.addChildren([catalogRoute, nftDetailRoute, cartRoute, checkoutRoute, authGateRoute, profileRoute, walletsRoute, favoritesRoute]) })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
