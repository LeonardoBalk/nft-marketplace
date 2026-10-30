import { useQuery } from '@tanstack/react-query'
import { catalogQuery } from '../features/catalog/queries'

export function CatalogPage() {
  const catalog = useQuery(catalogQuery)

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold">Mercado</h1>
      {catalog.isPending && <p role="status">Carregando NFTs...</p>}
      {catalog.isError && <p role="alert">Não foi possível carregar os NFTs.</p>}
      {catalog.data && (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.data.map((nft) => (
            <li className="rounded-lg border border-white/20 p-5" key={nft.id}>
              <h2 className="font-semibold">{nft.name}</h2>
              <p className="mt-3 text-amber-400">{nft.priceEth} ETH</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
