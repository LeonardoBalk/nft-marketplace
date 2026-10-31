import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { NftCard, NftCardSkeleton } from '../features/catalog/nft-card'
import { catalogQuery } from '../features/catalog/queries'
import { catalogSearchSchema } from '../features/catalog/contracts'
import { ethToWei } from '../shared/money/eth'
import { HomeSections } from './home-sections'

const categories = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade']
const networks = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
] as const
const sortOptions = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
] as const

export function CatalogPage() {
  const locationSearch = useRouterState({ select: (state) => state.location.search })
  const search = catalogSearchSchema.parse(locationSearch)
  const navigate = useNavigate()
  const catalog = useQuery(catalogQuery(search))
  const catalogItems = Array.isArray(catalog.data?.items) ? catalog.data.items : []
  const pageCount = catalog.data?.pageCount ?? 0
  const firstVisiblePage = Math.max(1, Math.min(search.page - 1, pageCount - 3))
  const catalogPayloadInvalid = catalog.data !== undefined && (
    !Array.isArray(catalog.data.items) ||
    !Array.isArray(catalog.data.facets?.categories) ||
    !Array.isArray(catalog.data.facets?.networks)
  )
  const [priceError, setPriceError] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const sortBoxRef = useRef<HTMLDivElement>(null)
  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const sortOptionRefs = useRef<Array<HTMLDivElement | null>>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(search.minPrice) || 0.02,
    Number(search.maxPrice) || 12.3,
  ])

  useEffect(() => {
    setPriceRange([
      Number(search.minPrice) || 0.02,
      Number(search.maxPrice) || 12.3,
    ])
  }, [search.minPrice, search.maxPrice])

  useEffect(() => {
    if (!sortOpen) return
    const selectedIndex = sortOptions.findIndex((option) => option.value === search.sort)
    sortOptionRefs.current[selectedIndex]?.focus()
  }, [sortOpen, search.sort])

  useEffect(() => {
    if (!sortOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!sortBoxRef.current?.contains(event.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [sortOpen])

  const chooseSort = (value: typeof search.sort) => {
    setSearch({ sort: value })
    setSortOpen(false)
    sortButtonRef.current?.focus()
  }

  const handleSortOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const offset = event.key === 'ArrowDown' ? 1 : -1
      sortOptionRefs.current[(index + offset + sortOptions.length) % sortOptions.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      sortOptionRefs.current[event.key === 'Home' ? 0 : sortOptions.length - 1]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setSortOpen(false)
      sortButtonRef.current?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseSort(sortOptions[index].value)
    }
  }

  const setSearch = (patch: Partial<typeof search>) => {
    void navigate({ to: '/', search: { ...search, ...patch, page: patch.page ?? 1 }, hash: 'catalogo' })
  }

  const applyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const minPrice = priceRange[0].toFixed(2)
    const maxPrice = priceRange[1].toFixed(2)
    if (minPrice && maxPrice && ethToWei(minPrice) > ethToWei(maxPrice)) {
      setPriceError('O preço mínimo deve ser menor que o máximo.')
      return
    }
    setPriceError('')
    setSearch({ minPrice, maxPrice })
  }

  return (
    <main className="pb-6">
      <section className="mx-auto mt-8 grid max-w-[1200px] items-center gap-8 px-5 pb-24 sm:px-8 lg:h-[450px] lg:grid-cols-[minmax(0,600px)_minmax(0,450px)] lg:gap-[110px] lg:pb-0 lg:pl-10 lg:pr-0 xl:px-0 xl:pl-10" aria-labelledby="hero-title">
        <div className="relative lg:flex lg:h-[364px] lg:flex-col lg:justify-center">
          <p className="mb-2 text-sm font-medium tracking-[0.1em] text-[#f5f1eb]">Bem-vindo à Kurio</p>
          <h1 id="hero-title" className="max-w-[600px] text-[32px] font-bold uppercase leading-[1.5] text-[#f5f1eb] sm:text-[43px] sm:leading-[70px]">Seja dono do futuro<br className="hidden sm:block" /> da arte digital</h1>
          <p className="mt-2 max-w-[557px] text-sm leading-6 text-[#cfb28c]">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
          <Button asChild className="mt-8 h-10 w-[140px] rounded-md bg-[#d28a4c] px-4 text-base uppercase"><Link to="/" search={search} hash="catalogo">Explorar</Link></Button>
          <div className="mt-10 hidden justify-end gap-2 lg:flex" aria-hidden="true"><span className="size-2 rounded-full bg-[#d28a4c]" /><span className="size-2 rounded-full bg-[#d28a4c]" /><span className="size-2 rounded-full bg-[#d28a4c]" /></div>
        </div>
        <Link to="/nft/$nftId" params={{ nftId: 'emerald-ape-042' }} className="group block aspect-square w-full max-w-[450px] overflow-hidden rounded-[24px] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">
          <img src="/artwork/emerald-ape.webp" alt="Emerald Ape #042, macaco de jaqueta verde e óculos" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" width="450" height="450" fetchPriority="high" />
        </Link>
      </section>

      <section id="catalogo" className="mx-auto mt-24 max-w-[1200px] scroll-mt-6 px-5 sm:px-8 xl:px-0" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="sr-only">Catálogo de NFTs</h2>
        <div className="grid gap-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12">
          <aside aria-label="Filtros do catálogo" className="flex flex-col gap-6 lg:self-start">
            <div className="flex flex-col gap-10 bg-[#241612] p-5">
              <section aria-labelledby="collections-title" className="flex flex-col gap-3">
                <h3 id="collections-title" className="text-[18px] font-bold leading-4">Coleções</h3>
                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:gap-0">
                  {categories.map((category) => <button type="button" key={category} aria-pressed={search.category === category} onClick={() => setSearch({ category: search.category === category ? '' : category })} className="filter-button flex h-10 w-full items-center justify-between px-3"><span>{category}</span><span className="filter-count min-w-[3ch] text-right tabular-nums">({catalog.data?.facets?.categories?.find((facet) => facet.name === category)?.count ?? '…'})</span></button>)}
                </div>
              </section>
              <form onSubmit={applyPrice} aria-labelledby="price-title" className="flex flex-col gap-3">
                <h3 id="price-title" className="text-[18px] font-bold leading-4">Faixa de preço</h3>
                <div className="flex flex-col gap-3 pl-3">
                  <div className="relative h-[21px] w-full">
                    <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#68422e]" />
                    <div className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#d28a4c]" style={{ left: `${(priceRange[0] / 18) * 100}%`, right: `${100 - (priceRange[1] / 18) * 100}%` }} />
                    <label className="sr-only" htmlFor="minimum-price">Preço mínimo em ETH</label>
                    <input id="minimum-price" type="range" min="0.02" max="18" step="0.01" value={priceRange[0]} onChange={(event) => setPriceRange((current) => [Math.min(Number(event.target.value), current[1] - 0.01), current[1]])} className="price-range absolute inset-0 z-10" />
                    <label className="sr-only" htmlFor="maximum-price">Preço máximo em ETH</label>
                    <input id="maximum-price" type="range" min="0.02" max="18" step="0.01" value={priceRange[1]} onChange={(event) => setPriceRange((current) => [current[0], Math.max(Number(event.target.value), current[0] + 0.01)])} className="price-range absolute inset-0 z-20" />
                  </div>
                  <p className="text-[15px] leading-5 text-[#f5f1eb]">Preço: {priceRange[0].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – {priceRange[1].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETH</p>
                  {priceError && <p role="alert" className="text-xs text-[#f1a28a]">{priceError}</p>}
                  <Button size="sm" className="h-9 w-[92px] rounded-md px-3 text-base font-bold">Aplicar</Button>
                </div>
              </form>
              <section aria-labelledby="network-title" className="flex flex-col gap-3">
                <h3 id="network-title" className="text-[18px] font-bold leading-4">Rede</h3>
                <div className="flex flex-wrap gap-2 pl-3 lg:flex-col lg:items-stretch lg:gap-0">
                  {networks.map((network) => <button type="button" key={network.value} aria-pressed={search.network === network.value} onClick={() => setSearch({ network: search.network === network.value ? '' : network.value })} className="filter-button flex h-10 w-full items-center justify-between"><span>{network.label}</span><span className="filter-count min-w-[3ch] text-right tabular-nums">({catalog.data?.facets?.networks?.find((facet) => facet.value === network.value)?.count ?? '…'})</span></button>)}
                </div>
              </section>
            </div>
            <div className="h-[470px] bg-[linear-gradient(180deg,rgba(210,138,76,0.1)_0%,rgba(210,138,76,0.03)_100%)] pb-1 pt-6 text-center">
              <p className="px-5 text-2xl font-bold uppercase leading-8 text-[#e89b55]">NFT em destaque</p>
              <p className="mt-4 px-5 text-[22px] font-bold uppercase leading-4">Oferta limitada</p>
              <Link to="/nft/$nftId" params={{ nftId: 'cosmic-bloom-118' }} className="group mt-4 block overflow-hidden rounded-[22px] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><img src="/artwork/cosmic-bloom.webp" alt="Cosmic Bloom #118" width="310" height="368" className="h-[368px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none" loading="lazy" /></Link>
            </div>
          </aside>

          <div className="min-w-0 lg:flex lg:flex-col lg:items-end lg:gap-[88px]">
            <div className="w-full lg:flex lg:flex-col lg:gap-8">
            <div className="mb-5 flex min-h-[18px] w-full flex-wrap items-center justify-between gap-4 lg:mb-0 lg:h-[18px]">
              <div className="flex h-[18px] flex-wrap items-center gap-5 text-[15px] leading-4"><span className="relative h-4 cursor-pointer text-[#e89b55] transition-colors after:absolute after:left-0 after:top-[18px] after:h-px after:w-full after:bg-[#d28a4c] after:content-[''] hover:text-[#f5f1eb]">Todos os NFTs</span><span className="h-4 cursor-pointer text-[#f5f1eb] transition-colors hover:text-[#e89b55]">Novos lançamentos</span><span className="h-4 cursor-pointer text-[#f5f1eb] transition-colors hover:text-[#e89b55]">Em alta</span></div>
              <div ref={sortBoxRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSortOpen(false) }} className="relative grid h-5 w-[300px] max-w-full shrink-0 grid-cols-[110px_minmax(0,1fr)] items-center text-[15px] font-normal leading-5 text-[#f5f1eb]">
                <span>Ordenar por:</span>
                <button
                  ref={sortButtonRef}
                  type="button"
                  role="combobox"
                  aria-label={`Ordenar por: ${sortOptions.find((option) => option.value === search.sort)?.label}`}
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  aria-controls="catalog-sort-options"
                  onClick={() => setSortOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      setSortOpen(true)
                    } else if (event.key === 'Escape') {
                      setSortOpen(false)
                    }
                  }}
                  className="flex h-5 w-full cursor-pointer items-center justify-between bg-transparent pr-6 text-left text-[15px] font-normal leading-5 text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d99558]"
                >
                  <span className="whitespace-nowrap">{sortOptions.find((option) => option.value === search.sort)?.label}</span>
                  <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} className={`pointer-events-none absolute right-1 top-0.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && <div id="catalog-sort-options" role="listbox" aria-label="Ordenar por" className="absolute right-0 top-full z-30 mt-2 w-[220px] overflow-hidden rounded-md border border-[#55321f] bg-[#241612] p-1 shadow-xl">
                  {sortOptions.map((option, index) => <div
                    key={option.value}
                    ref={(element) => { sortOptionRefs.current[index] = element }}
                    id={`catalog-sort-option-${option.value}`}
                    role="option"
                    aria-selected={search.sort === option.value}
                    tabIndex={search.sort === option.value ? 0 : -1}
                    onClick={() => chooseSort(option.value)}
                    onKeyDown={(event) => handleSortOptionKeyDown(event, index)}
                    className={`cursor-pointer whitespace-nowrap rounded px-2 py-1.5 text-left text-sm leading-5 outline-none transition-colors focus-visible:bg-[#38220f] ${search.sort === option.value ? 'bg-[#d28a4c] text-[#140d0a]' : 'text-[#f5f1eb] hover:bg-[#38220f] hover:text-[#e89b55]'}`}
                  >{option.label}</div>)}
                </div>}
              </div>
            </div>
            <div className="w-full">
              {catalog.isPending && <><p className="sr-only" role="status">Carregando NFTs...</p><ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-[34px] lg:gap-y-[72px]">{Array.from({ length: 9 }, (_, index) => <NftCardSkeleton key={index} />)}</ul></>}
              {(catalog.isError || catalogPayloadInvalid) && <div role="alert" className="border border-[#6e4b38] p-6"><p>Não foi possível carregar os NFTs.</p><Button variant="outline" className="mt-4" onClick={() => void catalog.refetch()}>Tentar novamente</Button></div>}
              {catalog.data && !catalogPayloadInvalid && catalogItems.length === 0 && <div className="border border-[#4d3026] p-8 text-center"><p>Nenhum NFT encontrado para esses filtros.</p><Button variant="ghost" className="mt-4" onClick={() => setSearch({ q: '', category: '', network: '', minPrice: '', maxPrice: '' })}>Limpar filtros</Button></div>}
              {catalog.data && !catalogPayloadInvalid && catalogItems.length > 0 && <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-[34px] lg:gap-y-[72px]">{catalogItems.map((nft, index) => <NftCard nft={nft} featuredRow={index < 3} key={nft.id} />)}</ul>}
            </div>
            </div>
            {catalog.data && !catalogPayloadInvalid && catalogItems.length > 0 && pageCount > 1 && <nav aria-label="Paginação do catálogo" className="mt-10 flex items-center justify-end gap-2 lg:mt-0">
              {search.page > 1 && <Button variant="ghost" size="icon" aria-label="Página anterior" onClick={() => setSearch({ page: search.page - 1 })} className="size-[35px] rounded-[4px] border border-[#3f2319] bg-transparent p-0 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]"><ChevronLeft size={18} strokeWidth={1.5} /></Button>}
              {Array.from({ length: Math.min(4, pageCount) }, (_, index) => {
                const page = firstVisiblePage + index
                const current = page === search.page
                return <Button key={page} variant={current ? 'default' : 'ghost'} size="icon" aria-label={`Página ${page}`} aria-current={current ? 'page' : undefined} onClick={() => setSearch({ page })} className={current
                  ? 'size-[35px] rounded-[4px] border border-[#d28a4c] bg-[#d28a4c] p-0 text-[18px] font-bold leading-4 text-[#140d0a] hover:bg-[#e89b55] hover:text-[#140d0a]'
                  : 'size-[35px] rounded-[4px] border border-[#3f2319] bg-transparent p-0 text-[18px] font-normal leading-4 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]'}>{page}</Button>
              })}
              {search.page < pageCount && <Button variant="ghost" size="icon" aria-label="Próxima página" onClick={() => setSearch({ page: search.page + 1 })} className="size-[35px] rounded-[4px] border border-[#3f2319] bg-transparent p-0 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]"><ChevronRight size={18} strokeWidth={1.5} /></Button>}
            </nav>}
          </div>
        </div>
      </section>
      <HomeSections />
    </main>
  )
}
