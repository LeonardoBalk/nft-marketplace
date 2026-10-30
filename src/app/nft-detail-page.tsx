import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react'
import { Button } from '../components/ui/button'
import { nftQuery } from '../features/catalog/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { useCart } from '../features/cart/cart-context'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const nft = useQuery(nftQuery(nftId))
  const { addItem } = useCart()
  const [addedToCart, setAddedToCart] = useState(false)

  if (nft.isPending) return <main className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8" role="status"><div className="grid animate-pulse gap-10 motion-reduce:animate-none md:grid-cols-2"><div className="aspect-square rounded-2xl bg-[#38251e]" /><div className="space-y-6"><div className="h-10 w-2/3 bg-[#38251e]" /><div className="h-6 w-1/3 bg-[#38251e]" /></div></div><span className="sr-only">Carregando detalhe do NFT...</span></main>

  if (nft.isError) {
    const notFound = isAxiosError(nft.error) && nft.error.response?.status === 404
    return <main className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8"><h1 className="text-3xl">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1><p className="mt-4 text-[#bca594]">{notFound ? 'Confira o endereço ou volte para o catálogo.' : 'Tente novamente em instantes.'}</p><Button asChild className="mt-8"><Link to="/" search={defaultCatalogSearch}>Voltar ao catálogo</Link></Button>{!notFound && <Button variant="ghost" className="ml-3" onClick={() => void nft.refetch()}>Tentar novamente</Button>}</main>
  }

  return <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:py-16 xl:px-[120px]">
    <Link to="/" search={defaultCatalogSearch} className="mb-8 inline-flex items-center gap-2 text-sm text-[#bca594] hover:text-[#d99558]"><ArrowLeft size={16} /> Voltar ao mercado</Link>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-16">
      <div className="grid grid-cols-[64px_1fr] gap-4 sm:grid-cols-[80px_1fr]">
        <div className="space-y-3"><img className="aspect-square w-full rounded-lg border border-[#d99558] object-cover" src={nft.data.artwork} alt="" width="80" height="80" /><img className="aspect-square w-full rounded-lg object-cover opacity-70" src={nft.data.artwork} alt="" width="80" height="80" /></div>
        <img className="aspect-square w-full rounded-[16px] object-cover" src={nft.data.artwork} alt={nft.data.name} width="560" height="560" />
      </div>
      <div>
        <p className="text-sm text-[#d99558]">{nft.data.collection}</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{nft.data.name}</h1>
        <p className="mt-5 text-sm leading-7 text-[#bca594]">Uma peça da coleção {nft.data.collection}, disponível na rede {nft.data.network}. Edição limitada a {nft.data.edition} unidades.</p>
        <div className="mt-8 border-y border-[#4d3026] py-6"><p className="text-sm text-[#bca594]">Preço atual</p><p className="mt-2 text-3xl font-semibold text-[#d99558]">{nft.data.priceEth} ETH</p><p className="mt-3 text-xs text-[#bca594]">{nft.data.available} disponíveis</p></div>
        <div className="mt-7 flex flex-wrap gap-3"><Button disabled={nft.data.available < 1} onClick={() => { addItem(nft.data.id, nft.data.available); setAddedToCart(true) }}><ShoppingCart size={17} /> Adicionar ao carrinho</Button><Button variant="outline" disabled><Heart size={17} /> Favoritar</Button></div>
        <p role={addedToCart ? 'status' : undefined} className="mt-4 text-xs text-[#967d6b]">{addedToCart ? 'Item adicionado ao carrinho.' : 'O carrinho é salvo neste navegador. Favoritos estarão disponíveis no próximo fluxo.'}</p>
      </div>
    </div>
    <section className="mt-16 max-w-3xl border-t border-[#4d3026] pt-10"><h2 className="text-xl font-semibold">Detalhes do NFT</h2><dl className="mt-6 grid grid-cols-2 gap-5 text-sm"><div><dt className="text-[#a88b77]">Edição</dt><dd className="mt-1">{nft.data.edition}</dd></div><div><dt className="text-[#a88b77]">Rede</dt><dd className="mt-1 capitalize">{nft.data.network}</dd></div><div><dt className="text-[#a88b77]">Coleção</dt><dd className="mt-1">{nft.data.collection}</dd></div><div><dt className="text-[#a88b77]">Categoria</dt><dd className="mt-1">{nft.data.category}</dd></div></dl></section>
  </main>
}
