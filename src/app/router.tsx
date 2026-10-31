import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { CatalogPage } from './catalog-page'
import { NftDetailPage } from './nft-detail-page'
import { CheckoutPage } from './checkout-page'
import { SiteHeader } from './site-header'
import { AuthPage } from './auth-page'
import { AuthModalContext, type AuthModalRequest } from '../features/auth/modal-context'
import { catalogSearchSchema } from '../features/catalog/contracts'

function RootLayout() {
  const [authModal, setAuthModal] = useState<AuthModalRequest | null>(null)
  const closeAuth = useCallback(() => setAuthModal(null), [])
  const openAuth = useCallback((mode: AuthModalRequest['mode'], redirect?: string) => setAuthModal({ mode, redirect }), [])
  const authModalContext = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth])

  return <AuthModalContext.Provider value={authModalContext}>
    <SiteHeader />
    <Outlet />
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

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
})

export const router = createRouter({ routeTree: rootRoute.addChildren([catalogRoute, nftDetailRoute, checkoutRoute]) })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
