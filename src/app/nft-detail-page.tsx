import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { ChevronLeft, Mail, Minus, Plus, ShoppingCart, Star, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SiteFooter } from './site-footer'
import { FavoriteButton } from '../features/favorites/favorite-button'
import { nftQuery } from '../features/catalog/queries'
import { RelatedCarousel } from '../features/catalog/related-carousel'
import { defaultCatalogSearch, type NftNetwork } from '../features/catalog/contracts'
import { useAddCartItem } from '../features/cart/queries'
import { lastCatalogSearch } from '../features/catalog/last-search'

const networkLabels: Record<NftNetwork, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
const galleryViews = ['Vista principal', 'Detalhe dos atributos', 'Arte em alta resolução', 'Visão da edição']
const editionOptions = [
  { label: '1/1', limit: 1 },
  { label: '1/10', limit: 10 },
  { label: '1/50', limit: 50 },
  { label: 'ABERTA', limit: Number.POSITIVE_INFINITY },
] as const
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
  const navigate = useNavigate()
  const [activeImage, setActiveImage] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [edition, setEdition] = useState<(typeof editionOptions)[number]['label']>('1/50')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes')

  if (nft.isPending) return <main className={`${pageShell} py-14`} role="status"><div className="grid gap-8 lg:grid-cols-[573px_minmax(0,1fr)]"><Skeleton className="aspect-square rounded-md" /><div className="space-y-6"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24 w-full" /></div></div><span className="sr-only">Carregando detalhe do NFT...</span></main>

  if (nft.isError) {
    const notFound = isAxiosError(nft.error) && nft.error.response?.status === 404
    return <main className={`${pageShell} py-24`}><h1 className="text-3xl">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1><p className="mt-4 text-[#bca594]">{notFound ? 'Confira o endereço ou volte para o catálogo.' : 'Tente novamente em instantes.'}</p><Button asChild className="mt-8"><Link to="/" search={defaultCatalogSearch}>Voltar ao catálogo</Link></Button>{!notFound && <Button variant="ghost" className="ml-3" onClick={() => void nft.refetch()}>Tentar novamente</Button>}</main>
  }

  const item = nft.data
  const network = networkLabels[item.network]
  const ratingValue = Math.round(item.rating)
  const reviewCount = item.reviews
  const editionLimit = item.editionAvailability[edition]
  // limite da edicao e o menor entre tiragem e estoque
  const maxQuantity = Math.min(item.available, editionLimit)
  const quantityToAdd = Math.min(quantity, maxQuantity)

  return <>
    <main className="relative mx-auto max-w-[1200px] bg-[linear-gradient(143.28deg,#241612_-12%,#2f1d15_106.59%)] bg-[length:100%_506px] bg-no-repeat px-[26px] pt-[23px] sm:px-8 lg:bg-none lg:pb-6 lg:pt-8 xl:px-0">
      {/* dois botões de favoritar, um por frame; getByRole só enxerga o que está visível */}
      <div className="mb-2 flex items-center justify-between lg:hidden">
        <Link to="/" search={lastCatalogSearch()} hash="catalogo" aria-label="Voltar ao catálogo" className="inline-flex size-[35px] items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#cfb28c] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" /></Link>
        <FavoriteButton nftId={item.id} nftName={item.name} size={16} className="size-[35px] rounded-full border-[#3f2319] bg-[#2f1d15] text-[#e89b55]" />
      </div>

      <nav aria-label="Trilha de navegação" className="hidden text-[15px] font-bold leading-4 lg:block">
        <Link to="/" search={defaultCatalogSearch} className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Início</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Mercado</Link>
      </nav>

      <div className="grid lg:mt-3 lg:grid-cols-[573px_minmax(0,1fr)] lg:gap-8">
        <div className="relative mx-auto flex w-full flex-row items-start gap-4 sm:max-w-[480px] sm:gap-7 lg:mx-0 lg:max-w-none">
          {/* no frame mobile a galeria fica sob a arte e não aparece; ela existe só no desktop */}
          <ul className="hidden w-[72px] flex-col gap-4 sm:w-[100px] lg:flex">
            {galleryViews.map((view, index) => <li key={view}>
              <button type="button" aria-label={`${view} (imagem ${index + 1} de ${galleryViews.length})`} aria-pressed={index === activeImage} onClick={() => setActiveImage(index)} className={`block w-full cursor-pointer overflow-hidden rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${index === activeImage ? 'border-[#d28a4c]' : 'border-transparent hover:border-[#d28a4c]/50'}`}>
                <img className="aspect-square w-full object-cover" src={item.artwork} alt="" loading="lazy" width="100" height="100" />
              </button>
            </li>)}
          </ul>
          <div className="relative min-w-0 flex-1">
            <div className="flex aspect-[361/356] w-full items-center justify-center overflow-hidden rounded-[24px] lg:aspect-square lg:rounded-md lg:bg-[#241612] lg:p-4">
              <img className={`size-full rounded-[24px] object-cover transition-transform lg:aspect-square lg:h-auto lg:w-full duration-300 motion-reduce:transition-none ${zoomed || activeImage === 1 ? 'scale-150' : 'scale-100'}`} src={item.artwork} alt={`${item.name} — ${galleryViews[activeImage].toLowerCase()}`} width="404" height="404" fetchPriority="high" />
            </div>
            <button type="button" aria-label={zoomed ? 'Reduzir imagem' : 'Ampliar imagem'} aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)} className="absolute right-[15px] top-[15px] hidden size-[30px] cursor-pointer lg:flex items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#f5f1eb] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] lg:items-center lg:justify-center"><ZoomIn size={18} strokeWidth={1.8} /></button>
          </div>
        </div>

        {/* folha do frame mobile: sobe 30px sobre a arte e ocupa a largura toda */}
        <div className="relative z-10 -mx-[26px] -mt-[30px] flex flex-col gap-3 rounded-t-[31px] bg-[#241612] px-6 pb-8 pt-8 sm:-mx-8 lg:mx-0 lg:mt-0 lg:gap-5 lg:rounded-none lg:bg-transparent lg:p-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 lg:block">
              <h1 className="text-xl font-bold leading-6 lg:text-[28px] lg:leading-[37px]">{item.name}</h1>
              {/* no mobile a nota é uma pílula ao lado do título; no desktop, a régua de estrelas */}
              <p className="inline-flex h-[27px] shrink-0 items-center gap-1.5 rounded-full border border-[#d28a4c] pl-1.5 pr-2 text-sm leading-4 lg:hidden">
                <Star size={12} aria-hidden="true" className="fill-[#e3a44e] text-[#e3a44e]" />
                <span><span className="sr-only">Avaliação </span><span className="font-medium text-[#f5f1eb]">{item.rating.toFixed(1)}</span><span className="text-[#cfb28c]">({reviewCount})</span></span>
              </p>
            </div>
            {/* preço e estrelas do desktop; escondida inteira, senão a linha vazia ainda soma o gap no mobile */}
            <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
              <p className="hidden text-[22px] font-bold leading-4 text-[#e89b55] lg:block">{item.priceEth} ETH</p>
              <p className="hidden items-center gap-1 text-[15px] leading-5 lg:flex">
                <span className="flex items-center gap-1" role="img" aria-label={`Avaliação ${ratingValue} de 5`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} aria-hidden="true" className={index < ratingValue ? 'fill-[#d28a4c] text-[#d28a4c]' : 'fill-[#cfb28c] text-[#cfb28c]'} />)}
                </span>
                {reviewCount} avaliações de colecionadores
              </p>
            </div>
            <span aria-hidden="true" className="hidden h-px w-full bg-[#d28a4c] lg:block" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="hidden text-[15px] font-bold leading-4 lg:block">Sobre este NFT:</h2>
            <p className="text-sm leading-6 text-[#cfb28c]">Um colecionável digital <span className="lg:hidden">{edition === 'ABERTA' ? 'de edição aberta' : edition} </span>finalizado à mão da coleção {item.collection}, verificado na {network}<span className="lg:hidden">.</span><span className="hidden lg:inline">, com arte desbloqueável e acesso para colecionadores.</span></p>
          </div>

          <div className="flex flex-col gap-2 lg:gap-3">
            <h2 id="edition-label" className="text-[15px] font-bold leading-4">Edição:</h2>
            {/* chips em elipse, como no frame: rounded-[50%] arredonda o contorno inteiro, rounded-full só as pontas */}
            <div role="group" aria-labelledby="edition-label" className="flex flex-wrap items-center gap-3">
              {editionOptions.map((option) => <button key={option.label} type="button" aria-pressed={option.label === edition} disabled={item.editionAvailability[option.label] === 0} onClick={() => { setEdition(option.label); setQuantity((current) => Math.min(current, Math.max(1, Math.min(item.available, item.editionAvailability[option.label])))) }} className={`h-7 min-w-[42px] cursor-pointer rounded-[50%] border text-sm leading-4 transition-colors ${option.limit === Number.POSITIVE_INFINITY ? 'px-2' : 'px-1'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${option.label === edition ? 'border-[#d28a4c] font-medium text-[#e89b55]' : 'border-[#3f2319] text-[#cfb28c] hover:border-[#d28a4c]'}`}>{option.label}</button>)}
            </div>
          </div>

          {/* a barra de compra do frame mobile: fixa no rodapé e, acima de lg, volta a ser uma linha comum */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-5 rounded-t-[40px] bg-[#241612] px-6 pb-[max(36px,env(safe-area-inset-bottom))] pt-5 shadow-[0_0_20px_rgba(10,6,4,0.45)] lg:static lg:z-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="flex items-center gap-2 lg:gap-3">
              <span aria-hidden="true" className="text-[15px] font-medium leading-4 text-[#cfb28c] lg:hidden">Qtd.</span>
              {/* stepper encostado no "Qtd." e preço empurrado para a direita, como no frame */}
              <div className="mr-auto flex items-center gap-3 lg:mr-0">
              <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-[30px] w-5 cursor-pointer items-center justify-center rounded-full border border-[#140d0a] bg-[#d28a4c] text-black shadow-[0_4px_12px_-2px_rgba(20,13,10,0.15)] lg:h-[49.5px] lg:w-[33px] lg:shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)] transition-colors hover:bg-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50"><Minus size={14} strokeWidth={2.5} className="lg:size-[22px]" /></button>
              <output aria-label="Quantidade" className="min-w-[13px] text-center text-[18px] font-medium leading-[25px] lg:text-xl lg:font-normal lg:leading-7">{quantity}</output>
              <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="flex h-[30px] w-5 cursor-pointer items-center justify-center rounded-full border border-[#140d0a] bg-[#d28a4c] text-black shadow-[0_4px_12px_-2px_rgba(20,13,10,0.15)] lg:h-[49.5px] lg:w-[33px] lg:shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)] transition-colors hover:bg-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50"><Plus size={14} strokeWidth={2.5} className="lg:size-[22px]" /></button>
              </div>
              {/* cópia do preço só para a barra: o nó com semântica é o do cabeçalho, acima */}
              <p aria-hidden="true" className="text-xl font-bold leading-4 text-[#e89b55] lg:hidden">{item.priceEth} ETH</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:gap-2">
              {/* comprar leva ao carrinho, onde ficam cupom e resumo; o ícone ao lado só adiciona e deixa a pessoa aqui */}
              <Button disabled={item.available < 1 || editionLimit < 1 || addItem.isPending} onClick={() => addItem.mutate({ nftId: item.id, edition, quantity: quantityToAdd }, { onSuccess: () => void navigate({ to: '/carrinho' }) })} className="h-[60px] min-h-0 w-[196px] flex-none rounded-[40px] bg-[linear-gradient(93.21deg,#d28a4c_-3.96%,rgba(210,138,76,0.8)_121.97%)] text-base font-bold leading-5 text-[#140d0a] lg:bg-none lg:h-10 lg:w-[130px] lg:flex-none lg:rounded-[6px] lg:bg-[#d28a4c] lg:text-sm"><span className="lg:hidden">Comprar NFT</span><span className="hidden lg:inline">COMPRAR</span></Button>
              <button type="button" aria-label="Adicionar ao carrinho" disabled={item.available < 1 || editionLimit < 1 || addItem.isPending} onClick={() => addItem.mutate({ nftId: item.id, edition, quantity: quantityToAdd }, { onSuccess: () => setAddedToCart(true) })} className="inline-flex cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 size-[60px] shrink-0 items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#b39463] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] lg:hidden"><ShoppingCart size={20} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /></button>
              <FavoriteButton nftId={item.id} nftName={item.name} size={20} showLabel className="hidden h-10 w-[130px] rounded-[6px] border-[#d28a4c] bg-transparent px-3 hover:border-[#e89b55] lg:inline-flex" />
            </div>
          </div>
          {addItem.isError
            ? <p role="alert" className="text-xs text-[#ffb59c]">{isAxiosError<{ message?: string }>(addItem.error) ? addItem.error.response?.data?.message ?? 'Não foi possível adicionar ao carrinho.' : 'Não foi possível adicionar ao carrinho.'}</p>
            : <p role={addedToCart ? 'status' : undefined} className={`text-xs text-[#967d6b] ${addedToCart ? '' : 'sr-only lg:not-sr-only'}`}>{addedToCart ? `${quantityToAdd} ${quantityToAdd === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho.` : `${maxQuantity} ${maxQuantity === 1 ? 'disponível' : 'disponíveis'} na edição ${edition.toLowerCase()}.`}</p>}

          <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-3 text-[15px] leading-5 text-[#b39463]">
              <div className="flex gap-[1ch]"><dt>ID do token:</dt><dd>{tokenId(item.id)}</dd></div>
              <div className="flex gap-[1ch]"><dt>Coleção:</dt><dd>{item.collection}</dd></div>
              <div className="flex gap-[1ch]"><dt>Atributos:</dt><dd>{item.attributes.join(', ')}</dd></div>
            </dl>
            <div className="hidden items-center gap-2 lg:flex">
              <h2 className="text-[15px] font-bold leading-4">Compartilhar este NFT:</h2>
              {shareLinks.map((share) => <span key={share.name} role="img" aria-label={`Compartilhar no ${share.name}`} className="flex cursor-pointer items-center text-[#f5f1eb] transition-colors hover:text-[#e89b55]">{share.icon}</span>)}
            </div>
          </div>
        </div>
      </div>
    </main>

    <section aria-label="Descrição do NFT" className={`${pageShell} mt-10 lg:mt-24`}>
      {/* o fio passa pelo meio da barra da aba ativa: sobe 2px e fica por baixo dela;
          isolate prende o z-10 aqui dentro, senão as abas cobrem a barra fixa de compra no mobile */}
      <div className="isolate flex flex-col">
        <div role="tablist" aria-label="Informações do NFT" className="relative z-10 flex flex-wrap gap-8">
          {([['detalhes', 'Detalhes do NFT'], ['avaliacoes', `Avaliações de colecionadores (${reviewCount})`]] as const).map(([value, label]) => <button key={value} type="button" role="tab" id={`tab-${value}`} aria-selected={tab === value} aria-controls={`panel-${value}`} onClick={() => setTab(value)} className={`flex cursor-pointer flex-col gap-3 text-[17px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d99558] ${tab === value ? 'font-bold text-[#e89b55]' : 'text-[#f5f1eb] hover:text-[#e89b55]'}`}>
            {label}
            <span aria-hidden="true" className={`h-[3px] w-full ${tab === value ? 'bg-[#d28a4c]' : 'bg-transparent'}`} />
          </button>)}
        </div>
        <span aria-hidden="true" className="-mt-[2px] h-px w-full bg-[#d28a4c]/40" />
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

    <RelatedCarousel nftId={item.id} title="Mais desta coleção" className={`${pageShell} mt-10 pb-[140px] lg:mt-24 lg:pb-0`} />
    <SiteFooter />
  </>
}
