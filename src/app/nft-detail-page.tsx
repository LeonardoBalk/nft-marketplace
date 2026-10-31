import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Heart, Mail, Minus, Plus, Star, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SiteFooter } from './site-footer'
import { nftQuery } from '../features/catalog/queries'
import { RelatedCarousel } from '../features/catalog/related-carousel'
import { defaultCatalogSearch, type NftNetwork } from '../features/catalog/contracts'
import { useAddCartItem } from '../features/cart/queries'

const networkLabels: Record<NftNetwork, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
const galleryViews = ['Vista principal', 'Detalhe dos atributos', 'Arte em alta resolução', 'Visão da edição']
const editionOptions = [
  { label: '1/1', limit: 1 },
  { label: '1/10', limit: 10 },
  { label: '1/50', limit: 50 },
  { label: 'ABERTA', limit: Number.POSITIVE_INFINITY },
] as const
const ratingValue = 4
const reviewCount = 19
const contractAddress = '0x7A42...19E8'
const shareLinks = [
  { name: 'LinkedIn', icon: <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M5.3 3.7a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0ZM1 8h4v15H1zm6.5 0h3.8v2.1h.1c.5-1 1.8-2.4 4.1-2.4 4.4 0 5.2 2.9 5.2 6.7V23h-4v-7.6c0-1.8 0-4.1-2.5-4.1s-2.8 1.9-2.8 4V23h-4z" /></svg> },
  { name: 'E-mail', icon: <Mail size={18} strokeWidth={1.8} aria-hidden="true" /> },
  { name: 'Twitter', icon: <svg viewBox="0 0 24 20" width="16" height="13" aria-hidden="true"><path fill="currentColor" d="M23.5 2.4a9.7 9.7 0 0 1-2.8.8A4.9 4.9 0 0 0 22.9.5a9.8 9.8 0 0 1-3.1 1.2A4.9 4.9 0 0 0 11.4 6a13.9 13.9 0 0 1-10-5.1 4.9 4.9 0 0 0 1.5 6.6 4.8 4.8 0 0 1-2.2-.6v.1a4.9 4.9 0 0 0 3.9 4.8 4.9 4.9 0 0 1-2.2.1 4.9 4.9 0 0 0 4.6 3.4A9.9 9.9 0 0 1 0 17.3 14 14 0 0 0 7.5 19.5c9.1 0 14-7.5 14-14v-.6a10 10 0 0 0 2-2.5" /></svg> },
]

const pageShell = 'mx-auto max-w-[1200px] px-5 sm:px-8 xl:px-0'

function tokenId(nftId: string) {
  return `#${(nftId.match(/\d+$/)?.[0] ?? '0').padStart(4, '0')}`
}

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const nft = useQuery(nftQuery(nftId))
  const addItem = useAddCartItem()
  const [activeImage, setActiveImage] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [edition, setEdition] = useState<(typeof editionOptions)[number]['label']>('1/50')
  const [quantity, setQuantity] = useState(1)
  const [favorited, setFavorited] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes')

  if (nft.isPending) return <main className={`${pageShell} py-14`} role="status"><div className="grid gap-8 lg:grid-cols-[573px_minmax(0,1fr)]"><Skeleton className="aspect-square rounded-md" /><div className="space-y-6"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24 w-full" /></div></div><span className="sr-only">Carregando detalhe do NFT...</span></main>

  if (nft.isError) {
    const notFound = isAxiosError(nft.error) && nft.error.response?.status === 404
    return <main className={`${pageShell} py-24`}><h1 className="text-3xl">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1><p className="mt-4 text-[#bca594]">{notFound ? 'Confira o endereço ou volte para o catálogo.' : 'Tente novamente em instantes.'}</p><Button asChild className="mt-8"><Link to="/" search={defaultCatalogSearch}>Voltar ao catálogo</Link></Button>{!notFound && <Button variant="ghost" className="ml-3" onClick={() => void nft.refetch()}>Tentar novamente</Button>}</main>
  }

  const item = nft.data
  const network = networkLabels[item.network]
  const editionLimit = editionOptions.find((option) => option.label === edition)?.limit ?? Number.POSITIVE_INFINITY
  // limite da edicao e o menor entre tiragem e estoque
  const maxQuantity = Math.max(1, Math.min(item.available, editionLimit))
  const quantityToAdd = Math.min(quantity, maxQuantity)

  return <>
    <main className={`${pageShell} pb-6 pt-8`}>
      <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
        <Link to="/" search={defaultCatalogSearch} className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Início</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Mercado</Link>
      </nav>

      <div className="mt-3 grid gap-8 lg:grid-cols-[573px_minmax(0,1fr)]">
        <div className="flex flex-row items-start gap-4 sm:gap-7">
          <ul className="flex w-[72px] flex-col gap-4 sm:w-[100px]">
            {galleryViews.map((view, index) => <li key={view}>
              <button type="button" aria-label={`${view} (imagem ${index + 1} de ${galleryViews.length})`} aria-pressed={index === activeImage} onClick={() => setActiveImage(index)} className={`block w-full cursor-pointer overflow-hidden rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${index === activeImage ? 'border-[#d28a4c]' : 'border-transparent hover:border-[#d28a4c]/50'}`}>
                <img className="aspect-square w-full object-cover" src={item.artwork} alt="" loading="lazy" width="100" height="100" />
              </button>
            </li>)}
          </ul>
          <div className="relative min-w-0 flex-1">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-[#241612] p-4">
              <img className={`aspect-square w-full rounded-[24px] object-cover transition-transform duration-300 motion-reduce:transition-none ${zoomed ? 'scale-150' : 'scale-100'}`} src={item.artwork} alt={`${item.name} — ${galleryViews[activeImage].toLowerCase()}`} width="404" height="404" fetchPriority="high" />
            </div>
            <button type="button" aria-label={zoomed ? 'Reduzir imagem' : 'Ampliar imagem'} aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)} className="absolute right-[15px] top-[15px] flex size-[30px] cursor-pointer items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#f5f1eb] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><ZoomIn size={18} strokeWidth={1.8} /></button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] font-bold leading-[37px]">{item.name}</h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[22px] font-bold leading-4 text-[#e89b55]">{item.priceEth} ETH</p>
              <p className="flex items-center gap-1 text-[15px] leading-5">
                <span className="flex items-center gap-1" role="img" aria-label={`Avaliação ${ratingValue} de 5`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} aria-hidden="true" className={index < ratingValue ? 'fill-[#d28a4c] text-[#d28a4c]' : 'fill-[#cfb28c] text-[#cfb28c]'} />)}
                </span>
                {reviewCount} avaliações de colecionadores
              </p>
            </div>
            <span aria-hidden="true" className="h-px w-full bg-[#d28a4c]" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold leading-4">Sobre este NFT:</h2>
            <p className="text-sm leading-6 text-[#cfb28c]">Um colecionável digital finalizado à mão da coleção {item.collection}, verificado na {network}, com arte desbloqueável e acesso para colecionadores.</p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 id="edition-label" className="text-[15px] font-bold leading-4">Edição:</h2>
            <div role="group" aria-labelledby="edition-label" className="flex flex-wrap items-center gap-[6px]">
              {editionOptions.map((option) => <button key={option.label} type="button" aria-pressed={option.label === edition} onClick={() => { setEdition(option.label); setQuantity((current) => Math.min(current, Math.max(1, Math.min(item.available, option.limit)))) }} className={`h-7 cursor-pointer rounded-full border px-3 text-sm leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${option.label === edition ? 'border-[#d28a4c] font-medium text-[#e89b55]' : 'border-[#3f2319] text-[#cfb28c] hover:border-[#d28a4c]'}`}>{option.label}</button>)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-[49.5px] w-[33px] cursor-pointer items-center justify-center rounded-full border border-[#140d0a] bg-[#d28a4c] text-black shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)] transition-colors hover:bg-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50"><Minus size={22} strokeWidth={2.5} /></button>
              <output aria-label="Quantidade" className="min-w-[13px] text-center text-xl leading-7">{quantity}</output>
              <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="flex h-[49.5px] w-[33px] cursor-pointer items-center justify-center rounded-full border border-[#140d0a] bg-[#d28a4c] text-black shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)] transition-colors hover:bg-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50"><Plus size={22} strokeWidth={2.5} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={item.available < 1} onClick={() => addItem.mutate({ nftId: item.id, quantity: quantityToAdd }, { onSuccess: () => setAddedToCart(true) })} className="h-10 w-[130px] min-h-0 rounded-[6px] text-sm font-bold">COMPRAR</Button>
              <Button variant="outline" aria-pressed={favorited} onClick={() => setFavorited(!favorited)} className="h-10 w-[130px] min-h-0 gap-2 rounded-[6px] border-[#d28a4c] px-3 text-sm font-medium text-[#e89b55] hover:border-[#e89b55]"><Heart size={20} className={favorited ? 'fill-[#d28a4c] text-[#d28a4c]' : ''} /> Favoritar</Button>
            </div>
          </div>
          {addItem.isError
            ? <p role="alert" className="text-xs text-[#ffb59c]">{isAxiosError<{ message?: string }>(addItem.error) ? addItem.error.response?.data?.message ?? 'Não foi possível adicionar ao carrinho.' : 'Não foi possível adicionar ao carrinho.'}</p>
            : <p role={addedToCart ? 'status' : undefined} className="text-xs text-[#967d6b]">{addedToCart ? `${quantityToAdd} ${quantityToAdd === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho.` : `${maxQuantity} ${maxQuantity === 1 ? 'disponível' : 'disponíveis'} na edição ${edition.toLowerCase()}.`}</p>}

          <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-3 text-[15px] leading-5 text-[#b39463]">
              <div className="flex gap-1"><dt>ID do token:</dt><dd>{tokenId(item.id)}</dd></div>
              <div className="flex gap-1"><dt>Coleção:</dt><dd>{item.collection}</dd></div>
              <div className="flex gap-1"><dt>Atributos:</dt><dd>{item.category}, {network}, edição de {item.edition}</dd></div>
            </dl>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold leading-4">Compartilhar este NFT:</h2>
              {shareLinks.map((share) => <span key={share.name} role="img" aria-label={`Compartilhar no ${share.name}`} className="flex cursor-pointer items-center text-[#f5f1eb] transition-colors hover:text-[#e89b55]">{share.icon}</span>)}
            </div>
          </div>
        </div>
      </div>
    </main>

    <section aria-label="Descrição do NFT" className={`${pageShell} mt-24`}>
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Informações do NFT" className="flex flex-wrap gap-8">
          {([['detalhes', 'Detalhes do NFT'], ['avaliacoes', `Avaliações de colecionadores (${reviewCount})`]] as const).map(([value, label]) => <button key={value} type="button" role="tab" id={`tab-${value}`} aria-selected={tab === value} aria-controls={`panel-${value}`} onClick={() => setTab(value)} className={`flex cursor-pointer flex-col gap-3 text-[17px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d99558] ${tab === value ? 'font-bold text-[#e89b55]' : 'text-[#f5f1eb] hover:text-[#e89b55]'}`}>
            {label}
            <span aria-hidden="true" className={`h-[3px] w-full ${tab === value ? 'bg-[#d28a4c]' : 'bg-transparent'}`} />
          </button>)}
        </div>
        <span aria-hidden="true" className="h-px w-full bg-[#d28a4c]" />
      </div>

      {tab === 'detalhes'
        ? <div id="panel-detalhes" role="tabpanel" aria-labelledby="tab-detalhes" className="mt-3 flex flex-col gap-3 text-sm leading-6 text-[#cfb28c]">
          <p>{item.name} é uma obra digital {edition} finalizada à mão da coleção {item.collection}. Cada atributo fica armazenado nos metadados do token e verificado na {network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.</p>
          <p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. O criador recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.</p>
          <h3 className="font-bold text-[#f5f1eb]">Rede:</h3>
          <p>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</p>
          <h3 className="font-bold text-[#f5f1eb]">Contrato:</h3>
          <p>{contractAddress} • Contrato inteligente ERC-721 verificado.</p>
          <h3 className="font-bold text-[#f5f1eb]">Direitos autorais:</h3>
          <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
        </div>
        : <div id="panel-avaliacoes" role="tabpanel" aria-labelledby="tab-avaliacoes" className="mt-3 flex flex-col gap-3 text-sm leading-6 text-[#cfb28c]">
          <p className="flex items-center gap-2 text-[15px] text-[#f5f1eb]">
            <span className="flex items-center gap-1" role="img" aria-label={`Avaliação ${ratingValue} de 5`}>
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} aria-hidden="true" className={index < ratingValue ? 'fill-[#d28a4c] text-[#d28a4c]' : 'fill-[#cfb28c] text-[#cfb28c]'} />)}
            </span>
            {ratingValue},0 de 5 em {reviewCount} avaliações
          </p>
          <p>As avaliações individuais de colecionadores ainda não estão disponíveis neste fluxo.</p>
        </div>}
    </section>

    <RelatedCarousel nftId={item.id} title="Mais desta coleção" className={`${pageShell} mt-24`} />
    <SiteFooter />
  </>
}
