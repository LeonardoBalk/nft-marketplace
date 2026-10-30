import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { CatalogPage } from './catalog-page'
import { NftDetailPage } from './nft-detail-page'
import { SiteHeader } from './site-header'
import { catalogSearchSchema } from '../features/catalog/contracts'

function RootLayout() {
  return <><SiteHeader /><Outlet /></>
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

export const router = createRouter({ routeTree: rootRoute.addChildren([catalogRoute, nftDetailRoute]) })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
