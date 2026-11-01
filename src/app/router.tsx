import { createRootRoute, createRoute, createRouter, Outlet, redirect, stripSearchParams, useNavigate, useRouterState, type RouterHistory } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Wrench } from 'lucide-react'
import { CatalogPage } from './catalog-page'
import { SiteHeader } from './site-header'
import { CartMergeNotice } from './cart-merge-notice'
import { MobileTabBar, hidesMobileNav } from './mobile-tab-bar'
import { NftDetailPage } from './nft-detail-page'
import { AuthGatePage } from './auth-gate-page'
import { authSearchSchema } from '../features/auth/contracts'
import { AuthModalContext, type AuthModalRequest } from '../features/auth/modal-context'
import { getAccessToken } from '../features/auth/session'
import { authKeys } from '../features/auth/queries'
import { catalogSearchSchema, defaultCatalogSearch } from '../features/catalog/contracts'
import { favoritesSearchSchema } from '../features/favorites/contracts'

// início e detalhe são portas de entrada (link direto, auditoria): ficam no pacote principal, sem uma ida extra à rede
// o modal de autenticação e o painel de demonstração só aparecem depois de um clique
const AuthPage = lazy(() => import('./auth-page').then((module) => ({ default: module.AuthPage })))
const DemoPanel = lazy(() => import('./demo-panel').then((module) => ({ default: module.DemoPanel })))
const CartPage = lazy(() => import('./cart-page').then((module) => ({ default: module.CartPage })))
const FavoritesPage = lazy(() => import('./favorites-page').then((module) => ({ default: module.FavoritesPage })))
const ProfilePage = lazy(() => import('./profile-page').then((module) => ({ default: module.ProfilePage })))
const WalletsPage = lazy(() => import('./wallets-page').then((module) => ({ default: module.WalletsPage })))
const CheckoutPage = lazy(() => import('./checkout-page').then((module) => ({ default: module.CheckoutPage })))
const OrderConfirmationPage = lazy(() => import('./order-confirmation-page').then((module) => ({ default: module.OrderConfirmationPage })))

function RouteLoading() {
  return <main role="status" className="mx-auto max-w-[1200px] px-5 py-14"><span className="sr-only">Carregando página...</span><div className="h-80 animate-pulse rounded-lg bg-[#2f1d15] motion-reduce:animate-none" /></main>
}

// barra o fluxo privado antes de montar a tela e guarda o destino para retomar
function requireSession({ location }: { location: { href: string } }) {
  if (!getAccessToken()) throw redirect({ to: '/entrar', search: { mode: 'login' as const, redirect: location.href } })
}

function RootLayout() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [authModal, setAuthModal] = useState<AuthModalRequest | null>(null)
  const [demoRequested, setDemoRequested] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const sessionExpiredHandled = useRef(false)
  const onAuthRoute = useRouterState({ select: (state) => state.location.pathname === '/entrar' })
  const onReceiptRoute = useRouterState({ select: (state) => state.location.pathname.startsWith('/pedido/') })
  const hideMobileNav = useRouterState({ select: (state) => hidesMobileNav(state.location.pathname) })
  const closeAuth = useCallback(() => {
    setAuthModal(null)
    // /entrar só existe para o modal: fechar lá tem que devolver para a inicial
    if (onAuthRoute) void navigate({ to: '/', search: defaultCatalogSearch })
  }, [onAuthRoute, navigate])
  const openAuth = useCallback((mode: AuthModalRequest['mode'], redirect?: string) => setAuthModal({ mode, redirect }), [])
  const authModalContext = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth])

  useEffect(() => {
    const handleSessionExpired = () => {
      if (sessionExpiredHandled.current) return
      sessionExpiredHandled.current = true
      queryClient.setQueryData(authKeys.session, null)
      void queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.session[0] })
      openAuth('login', `${window.location.pathname}${window.location.search}${window.location.hash}`)
    }
    const handleSessionRestored = () => { sessionExpiredHandled.current = false }
    window.addEventListener('kurio:session-expired', handleSessionExpired)
    window.addEventListener('kurio:session-restored', handleSessionRestored)
    return () => {
      window.removeEventListener('kurio:session-expired', handleSessionExpired)
      window.removeEventListener('kurio:session-restored', handleSessionRestored)
    }
  }, [openAuth, queryClient])

  return <AuthModalContext.Provider value={authModalContext}>
    {/* a confirmação é o cartão do recibo sozinho na página, sem header */}
    {!onReceiptRoute && <SiteHeader />}
    <CartMergeNotice />
    <Suspense fallback={<RouteLoading />}><Outlet /></Suspense>
    {/* folga para o conteúdo não terminar embaixo da tab bar fixa */}
    {!hideMobileNav && <div aria-hidden="true" className="h-[calc(136px+env(safe-area-inset-bottom))] md:hidden" />}
    <MobileTabBar />
    {/* atalho para os cenários do msw; some quando os mocks estão desligados */}
    <Suspense fallback={null}>
      {mounted && import.meta.env.VITE_ENABLE_MOCKS !== 'false' && (demoRequested
        ? <DemoPanel raised={!hideMobileNav} initiallyOpen />
        : <div data-demo-panel className={`fixed right-4 z-40 md:bottom-6 md:right-6 md:block ${!hideMobileNav ? 'bottom-[calc(150px+env(safe-area-inset-bottom))] block' : 'hidden'}`}>
          <button type="button" aria-expanded="false" aria-label="Abrir modo demonstração" onClick={() => setDemoRequested(true)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-[#55321f] bg-[#241612]/95 text-[#e89b55] shadow-[0_8px_24px_rgba(20,13,10,0.5)] transition-colors hover:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d28a4c]">
            <Wrench size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>)}
      {authModal && <AuthPage key={authModal.mode} mode={authModal.mode} redirect={authModal.redirect} onClose={closeAuth} />}
    </Suspense>
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
  // o schema direto (standard schema) tipa a entrada da url; cada campo tem .catch, então nunca lança
  validateSearch: catalogSearchSchema,
  // a url guarda só o que difere do padrão: o catálogo sem filtro é "/", e o que falta volta pelo schema
  search: { middlewares: [stripSearchParams(defaultCatalogSearch)] },
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

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedido/$orderId',
  component: OrderConfirmationPage,
  beforeLoad: requireSession,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
  beforeLoad: requireSession,
})

const routeTree = rootRoute.addChildren([catalogRoute, nftDetailRoute, cartRoute, checkoutRoute, authGateRoute, profileRoute, walletsRoute, favoritesRoute, orderRoute])
export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history })
}
export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
