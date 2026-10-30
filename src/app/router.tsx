import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { CatalogPage } from './catalog-page'

const rootRoute = createRootRoute({ component: Outlet })
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CatalogPage,
})

export const router = createRouter({ routeTree: rootRoute.addChildren([catalogRoute]) })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
