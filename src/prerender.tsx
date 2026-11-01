import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './app/router'
import { defaultCatalogSearch } from './features/catalog/contracts'
import { catalogKey, nftKey } from './features/catalog/queries'
import { getNft, listNfts } from './mocks/catalog'

export function fixtureIds() {
  const first = listNfts(defaultCatalogSearch)
  return Array.from({ length: first.pageCount }, (_, index) =>
    listNfts({ ...defaultCatalogSearch, page: index + 1 }).items.map((item) => item.id),
  ).flat()
}

export async function renderPage(path: string) {
  const client = new QueryClient()
  if (path === '/') {
    client.setQueryData([...catalogKey, defaultCatalogSearch], listNfts(defaultCatalogSearch))
  } else {
    const nft = getNft(decodeURIComponent(path.slice('/nft/'.length)))
    if (!nft) throw new Error(`NFT not found: ${path}`)
    client.setQueryData(nftKey(nft.id), nft)
  }
  const state = dehydrate(client)
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  await router.load()
  const html = renderToString(
    <StrictMode><QueryClientProvider client={client}><HydrationBoundary state={state}><RouterProvider router={router} /></HydrationBoundary></QueryClientProvider></StrictMode>,
  )
  return { html, state }
}
