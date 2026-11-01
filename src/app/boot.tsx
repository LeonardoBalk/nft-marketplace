import { StrictMode, useEffect } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { whenMocksReady } from '../shared/api/mocks-ready'

const queryClient = new QueryClient()
let realtimeStarted = false

const stateNode = document.getElementById('__QUERY_STATE__')
const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
const canHydrate = stateNode?.getAttribute('data-path') === currentPath && !window.location.search
let initialState: DehydratedState | undefined
if (canHydrate && stateNode?.textContent) {
  try { initialState = JSON.parse(stateNode.textContent) as DehydratedState } catch { initialState = undefined }
}

function AfterHydration() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
    window.dispatchEvent(new Event('kurio:hydrated'))
    if (initialState) void whenMocksReady().then(() => queryClient.invalidateQueries({ queryKey: ['nfts'] }))
    if (!realtimeStarted) {
      realtimeStarted = true
      void startRealtime()
    }
  }, [])
  return null
}

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={initialState}>
        <RouterProvider router={router} />
        <AfterHydration />
      </HydrationBoundary>
    </QueryClientProvider>
  </StrictMode>
)
const root = document.getElementById('root')!
if (initialState) {
  // Resolve the same route matches used for the server render before hydrating.
  router.ssr = { manifest: undefined }
  void router.load().then(() => hydrateRoot(root, app))
} else createRoot(root).render(app)

async function startRealtime() {
  // o socket simulado só existe depois que o msw assume a página
  await whenMocksReady()
  const { connectCatalog } = await import('../shared/realtime/catalog-connection')
  let disconnectCatalog = connectCatalog(queryClient)
  const restartSocket = () => {
    disconnectCatalog()
    disconnectCatalog = connectCatalog(queryClient)
  }
  window.addEventListener('kurio:session-restored', restartSocket)
  window.addEventListener('kurio:session-expired', restartSocket)
  window.addEventListener('kurio:session-ended', restartSocket)
  window.addEventListener('pagehide', () => {
    disconnectCatalog()
  })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restartSocket()
  })
}
