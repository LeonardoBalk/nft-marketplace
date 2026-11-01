import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { NftCard, NftCardSkeleton } from '../features/catalog/nft-card'
import { catalogQuery } from '../features/catalog/queries'
import { catalogSearchSchema } from '../features/catalog/contracts'
import { rememberCatalogSearch } from '../features/catalog/last-search'
import { useCatalogSearchField } from '../features/catalog/use-catalog-search-field'
import { activeFilterCount, catalogCategories as categories, catalogNetworks as networks, catalogTabs, selectedCategories, toggleCategory } from '../features/catalog/filters'
import { ethToWei } from '../shared/money/eth'
import { HomeSections } from './home-sections'
import { MobileFilterSheet } from './mobile-filter-sheet'

const sortOptions = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
] as const

// ícone de filtro do frame; o do lucide tem outro desenho
function FilterIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.215 16.3925H4.28186" />
      <path d="M13.9379 16.3934C13.9379 18.2651 14.562 18.8884 16.4328 18.8884C18.3037 18.8884 18.9278 18.2651 18.9278 16.3934C18.9278 14.5218 18.3037 13.8984 16.4328 13.8984C14.562 13.8984 13.9379 14.5218 13.9379 16.3934Z" />
      <path d="M12.9952 6.77776H18.9275" />
      <path d="M9.27232 6.77671C9.27232 4.90589 8.64817 4.28174 6.77735 4.28174C4.90571 4.28174 4.28156 4.90589 4.28156 6.77671C4.28156 8.64835 4.90571 9.27169 6.77735 9.27169C8.64817 9.27169 9.27232 8.64835 9.27232 6.77671Z" />
    </svg>
  )
}

export function CatalogPage() {
  const interactive = useSyncExternalStore(() => () => {}, () => true, () => false)
  const locationSearch = useRouterState({ select: (state) => state.location.search })
  // parse memoizado: os efeitos da busca dependem dele e não podem rodar a cada letra
  const search = useMemo(() => catalogSearchSchema.parse(locationSearch), [locationSearch])
  // ao sair para outra rota o catálogo ainda renderiza com a url de destino; aí não vale gravar nada
  const onCatalogRoute = useRouterState({ select: (state) => state.location.pathname === '/' })
  const navigate = useNavigate()
  const catalog = useQuery({ ...catalogQuery(search), placeholderData: keepPreviousData })
  const catalogItems = Array.isArray(catalog.data?.items) ? catalog.data.items : []
  const pageCount = catalog.data?.pageCount ?? 0
  const firstVisiblePage = Math.max(1, Math.min(search.page - 1, pageCount - 3))
  const catalogPayloadInvalid = catalog.data !== undefined && (
    !Array.isArray(catalog.data.items) ||
    !Array.isArray(catalog.data.facets?.categories) ||
    !Array.isArray(catalog.data.facets?.networks)
  )
  const [priceError, setPriceError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const filterCount = activeFilterCount(search)
  const searchField = useCatalogSearchField()
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
    if (onCatalogRoute) rememberCatalogSearch(search)
  }, [search, onCatalogRoute])

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

  // abas no padrão do aria: setas e home/end andam entre elas e já aplicam o recorte
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = catalogTabs.length - 1
    const keys: Record<string, number> = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }
    const target = keys[event.key]
    if (target === undefined) return
    event.preventDefault()
    tabRefs.current[target]?.focus()
    setSearch({ tab: catalogTabs[target].value })
  }

  // filtro, aba e ordenação ficam ao lado da grade: trocam a url sem mexer na rolagem
  const setSearch = (patch: Partial<typeof search>) => {
    void navigate({ to: '/', search: { ...search, ...patch, page: patch.page ?? 1 }, resetScroll: false })
  }

  // a paginação fica no fim da grade: a página nova tem que começar do topo dela
  const goToPage = (page: number) => {
    setSearch({ page })
    document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
  }

  // filtro da folha: troca a url sem rolar nem empilhar histórico, a folha continua aberta
  const applyFilters = (patch: Partial<typeof search>) => {
    void navigate({ to: '/', search: { ...search, ...patch, page: 1 }, replace: true, resetScroll: false })
  }

  const closeFilters = () => {
    setFiltersOpen(false)
    filterButtonRef.current?.focus()
  }

  const showFilteredResults = () => {
    closeFilters()
    document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
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
      {/* frame mobile: 366px de conteúdo em 414 de tela, ou seja 24px de folga lateral */}
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-[#140d0a] px-6 pb-3 pt-5 md:hidden">
        <form role="search" onSubmit={(event) => { event.preventDefault(); searchField.submit(); (document.activeElement as HTMLElement | null)?.blur() }} className="flex h-[45px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-[#241612] px-3">
          <Search aria-hidden="true" size={22} strokeWidth={1.8} className="shrink-0 text-[#b39463]" />
          <label htmlFor="buscar" className="sr-only">Explorar coleções</label>
          <input id="buscar" name="q" disabled={!interactive} value={searchField.value} onChange={(event) => searchField.change(event.target.value)} maxLength={80} placeholder={interactive ? "Explorar coleções" : "Carregando busca..."} enterKeyHint="search" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-sm font-bold leading-4 text-[#f5f1eb] outline-none placeholder:font-bold placeholder:text-[#b39463]" />
          {searchField.value && <button type="button" aria-label="Limpar busca" onClick={searchField.clear} className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#b39463] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d99558]"><X size={16} strokeWidth={2} aria-hidden="true" /></button>}
        </form>
        <button ref={filterButtonRef} type="button" aria-label={filterCount ? `Abrir filtros (${filterCount} ${filterCount === 1 ? 'ativo' : 'ativos'})` : 'Abrir filtros'} aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)} className="relative inline-flex size-[45px] shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-[linear-gradient(137.05deg,rgba(210,138,76,0.45)_-24.6%,#d28a4c_100%)] text-[#140d0a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><FilterIcon />{filterCount > 0 && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-[#140d0a] bg-[#f5f1eb] text-[11px] font-bold leading-none text-[#140d0a]">{filterCount}</span>}</button>
      </div>

      {/* o fundo é um véu laranja de 20% a 10% sobre a página escura; as elipses dão o brilho */}
      <section aria-labelledby="hero-title-mobile" className="relative mx-6 mt-2 flex h-[190px] flex-col items-center justify-center gap-4 overflow-hidden rounded-[30px] bg-[linear-gradient(104.74deg,rgba(210,138,76,0.2)_1.08%,rgba(210,138,76,0.1)_99.23%)] p-4 md:hidden">
        <span aria-hidden="true" className="absolute -left-20 -top-[31px] size-[248px] rounded-full bg-[linear-gradient(160.25deg,rgba(221,154,95,0.43)_22.1%,rgba(210,138,76,0.04)_87.42%)]" />
        <span aria-hidden="true" className="absolute -top-[10px] left-[73px] size-[248px] rounded-full bg-[linear-gradient(160.25deg,rgba(221,154,95,0.37)_22.1%,rgba(210,138,76,0)_87.42%)]" />
        <div className="relative flex h-[156px] w-full shrink-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-col gap-[6px]">
              <p className="text-xs font-medium leading-4 text-[#f5f1eb]">Bem-vindo à Kurio</p>
              <h1 id="hero-title-mobile" className="text-[18px] font-bold uppercase leading-[29px] text-[#f5f1eb]">Seja dono da cultura digital</h1>
              <p className="text-xs leading-[18px] text-[#cfb28c]">Descubra NFTs selecionados de criadores do mundo todo.</p>
            </div>
            <Link to="/" search={search} hash="catalogo" className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase leading-[14px] text-[#e89b55] transition-colors hover:text-[#f5b477] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d99558]">Explorar <ArrowRight size={16} strokeWidth={1.5} className="text-[#d28a4c]" aria-hidden="true" /></Link>
          </div>
          {/* o texto mantém os 188px do frame; abaixo de 414 quem encolhe é a arte (100vw - margens - padding - gap - texto) */}
            <div className="relative hidden aspect-[138/146] w-[clamp(84px,calc(100vw-276px),138px)] shrink-0 min-[360px]:block">
              <img src="/artwork/emerald-ape.webp" alt="" width="138" height="138" fetchPriority="high" className="absolute left-0 top-0 aspect-square w-full rounded-[16px] object-cover" />
              <img src="/artwork/cosmic-bloom.webp" alt="" width="58" height="58" loading="lazy" className="absolute left-[10.1%] top-[60.3%] aspect-square w-[42%] rounded-[16px] object-cover" />
            </div>
        </div>
        <div className="relative flex shrink-0 gap-[6px]" aria-hidden="true"><span className="size-[7px] rounded-full bg-[#d28a4c]" /><span className="size-[7px] rounded-full bg-[#d28a4c]" /><span className="size-[7px] rounded-full bg-[#d28a4c]" /></div>
      </section>
      {filtersOpen && <MobileFilterSheet search={search} facets={catalog.data?.facets} total={catalog.data?.total} onChange={applyFilters} onClose={closeFilters} onShowResults={showFilteredResults} />}

      <section className="mx-auto mt-8 hidden max-w-[1200px] items-center gap-8 px-5 pb-24 sm:px-8 md:grid lg:h-[450px] lg:grid-cols-[minmax(0,600px)_minmax(0,450px)] lg:gap-[110px] lg:pb-0 lg:pl-10 lg:pr-0 xl:px-0 xl:pl-10" aria-labelledby="hero-title">
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

      <section id="catalogo" className="mx-auto mt-8 max-w-[1200px] scroll-mt-[84px] px-6 sm:px-8 md:mt-24 md:scroll-mt-6 xl:px-0" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="sr-only">Catálogo de NFTs</h2>
        <div className="grid gap-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12">
          <aside id="catalog-filters" aria-label="Filtros do catálogo" className="hidden flex-col gap-6 lg:flex lg:self-start">
            <div className="flex flex-col gap-10 bg-[#241612] p-5">
              <section aria-labelledby="collections-title" className="flex flex-col gap-3">
                <h3 id="collections-title" className="text-[18px] font-bold leading-4">Coleções</h3>
                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:gap-0">
                  {categories.map((category) => <button type="button" key={category} aria-pressed={selectedCategories(search).includes(category)} onClick={() => setSearch({ category: toggleCategory(search, category) })} className="filter-button flex h-10 w-full items-center justify-between px-3"><span>{category}</span><span className="filter-count min-w-[3ch] text-right tabular-nums">({catalog.data?.facets?.categories?.find((facet) => facet.name === category)?.count ?? '…'})</span></button>)}
                </div>
              </section>
              <form onSubmit={applyPrice} aria-labelledby="price-title" className="flex flex-col gap-3">
                <h3 id="price-title" className="text-[18px] font-bold leading-4">Faixa de preço</h3>
                <div className="flex flex-col gap-3 pl-3">
                  <div className="relative h-[21px] w-full">
                    <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#68422e]" />
                    <div className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#d28a4c]" style={{ left: `${(priceRange[0] / 18) * 100}%`, right: `${100 - (priceRange[1] / 18) * 100}%` }} />
                    <label className="sr-only" htmlFor="minimum-price">Preço mínimo em ETH</label>
                    <input id="minimum-price" type="range" min="0.02" max="18" step="0.01" disabled={!interactive} value={priceRange[0]} onChange={(event) => setPriceRange((current) => [Math.min(Number(event.target.value), current[1] - 0.01), current[1]])} className="price-range absolute inset-0 z-10" />
                    <label className="sr-only" htmlFor="maximum-price">Preço máximo em ETH</label>
                    <input id="maximum-price" type="range" min="0.02" max="18" step="0.01" disabled={!interactive} value={priceRange[1]} onChange={(event) => setPriceRange((current) => [current[0], Math.max(Number(event.target.value), current[0] + 0.01)])} className="price-range absolute inset-0 z-20" />
                  </div>
                  <p className="text-[15px] leading-5 text-[#f5f1eb]">Preço: {priceRange[0].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – {priceRange[1].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETH</p>
                  {priceError && <p role="alert" className="text-xs text-[#f1a28a]">{priceError}</p>}
                  <Button size="sm" disabled={!interactive} className="h-9 w-[92px] rounded-md px-3 text-base font-bold">Aplicar</Button>
                </div>
              </form>
              <section aria-labelledby="network-title" className="flex flex-col gap-3">
                <h3 id="network-title" className="text-[18px] font-bold leading-4">Rede</h3>
                <div className="flex flex-wrap gap-2 pl-3 lg:flex-col lg:items-stretch lg:gap-0">
                  {networks.map((network) => <button type="button" key={network.value} aria-pressed={search.network === network.value} onClick={() => setSearch({ network: search.network === network.value ? '' : network.value })} className="filter-button flex h-10 w-full items-center justify-between"><span>{network.label}</span><span className="filter-count min-w-[3ch] text-right tabular-nums">({catalog.data?.facets?.networks?.find((facet) => facet.value === network.value)?.count ?? '…'})</span></button>)}
                </div>
              </section>
            </div>
            <div className="hidden h-[470px] bg-[linear-gradient(180deg,rgba(210,138,76,0.1)_0%,rgba(210,138,76,0.03)_100%)] pb-1 pt-6 text-center">
              <p className="px-5 text-2xl font-bold uppercase leading-8 text-[#e89b55]">NFT em destaque</p>
              <p className="mt-4 px-5 text-[22px] font-bold uppercase leading-4">Oferta limitada</p>
              <Link to="/nft/$nftId" params={{ nftId: 'cosmic-bloom-118' }} className="group mt-4 block overflow-hidden rounded-[22px] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><img src="/artwork/cosmic-bloom.webp" alt="Cosmic Bloom #118" width="310" height="368" className="h-[368px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none" loading="lazy" /></Link>
            </div>
          </aside>

          <div className="min-w-0 lg:flex lg:flex-col lg:items-end lg:gap-[88px]">
            <div className="w-full lg:flex lg:flex-col lg:gap-8">
            <div className="mb-5 flex w-full flex-col items-start gap-4 lg:mb-0 lg:h-[18px] lg:flex-row lg:items-center lg:justify-between">
              <div role="tablist" aria-label="Recortes do catálogo" className="-mx-6 flex w-[calc(100%+48px)] items-start gap-4 overflow-x-auto whitespace-nowrap px-6 pb-1 text-sm leading-4 lg:mx-0 lg:h-[18px] lg:w-auto lg:items-center lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0 lg:text-[15px]">
                {catalogTabs.map((tab, index) => {
                  const selected = search.tab === tab.value
                  const tabId = `catalog-tab-${tab.value || 'todos'}`
                  // no mobile o traço é um elemento de 2px; no desktop segue o pseudo de 1px
                  return <button key={tabId} ref={(element) => { tabRefs.current[index] = element }} type="button" role="tab" id={tabId} aria-selected={selected} aria-controls="catalog-results" tabIndex={selected ? 0 : -1} onClick={() => setSearch({ tab: tab.value })} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`relative flex shrink-0 cursor-pointer flex-col gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] lg:h-4 lg:font-normal ${selected ? "font-bold text-[#e89b55] hover:text-[#f5f1eb] lg:after:absolute lg:after:left-0 lg:after:top-[18px] lg:after:h-px lg:after:w-full lg:after:bg-[#d28a4c] lg:after:content-['']" : 'text-[#f5f1eb] hover:text-[#e89b55]'}`}>
                    {tab.label}
                    <span aria-hidden="true" className={`h-[2px] w-full lg:hidden ${selected ? 'bg-[#d28a4c]' : 'bg-transparent'}`} />
                  </button>
                })}
              </div>
              <div ref={sortBoxRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSortOpen(false) }} className="relative grid h-8 w-fit max-w-full shrink-0 grid-cols-[minmax(0,1fr)] items-center rounded-full border border-[#55321f] px-3 text-[13px] font-normal leading-4 text-[#f5f1eb] transition-colors focus-within:border-[#d28a4c] hover:border-[#d28a4c] lg:h-5 lg:w-[300px] lg:grid-cols-[110px_minmax(0,1fr)] lg:rounded-none lg:border-0 lg:px-0 lg:text-[15px] lg:leading-5">
                <span className="hidden lg:inline">Ordenar por:</span>
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
                  className="flex h-5 w-full cursor-pointer items-center justify-between gap-2 bg-transparent pr-5 text-left text-[13px] font-normal leading-4 text-[#f5f1eb] lg:pr-6 lg:text-[15px] lg:leading-5 transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d99558]"
                >
                  <span className="whitespace-nowrap">{sortOptions.find((option) => option.value === search.sort)?.label}</span>
                  <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#d28a4c] transition-transform lg:right-1 lg:top-0.5 lg:translate-y-0 lg:text-current ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && <div id="catalog-sort-options" role="listbox" aria-label="Ordenar por" className="absolute left-0 top-full z-30 mt-2 w-[220px] lg:left-auto lg:right-0 overflow-hidden rounded-md border border-[#55321f] bg-[#241612] p-1 shadow-xl">
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
            <div id="catalog-results" role="tabpanel" aria-labelledby={`catalog-tab-${search.tab || 'todos'}`} className="w-full">
              {catalog.isPending && <><p className="sr-only" role="status">Carregando NFTs...</p><ul className="mx-auto grid w-full max-w-[366px] grid-cols-2 gap-x-4 gap-y-6 sm:max-w-none sm:grid-cols-3 sm:gap-x-[34px] sm:gap-y-8 lg:gap-y-[72px]">{Array.from({ length: 9 }, (_, index) => <NftCardSkeleton key={index} staggeredMobile={index % 2 === 1} />)}</ul></>}
              {(catalog.isError || catalogPayloadInvalid) && <div role="alert" className="border border-[#6e4b38] p-6"><p>Não foi possível carregar os NFTs.</p><Button variant="outline" className="mt-4" onClick={() => void catalog.refetch()}>Tentar novamente</Button></div>}
              {catalog.data && !catalogPayloadInvalid && catalogItems.length === 0 && <div className="border border-[#4d3026] p-8 text-center"><p>Nenhum NFT encontrado para esses filtros.</p><Button variant="ghost" className="mt-4" onClick={() => setSearch({ q: '', category: '', network: '', minPrice: '', maxPrice: '', tab: '' })}>Limpar filtros</Button></div>}
              {catalog.data && !catalogPayloadInvalid && catalogItems.length > 0 && <ul className="mx-auto grid w-full max-w-[366px] grid-cols-2 gap-x-4 gap-y-6 sm:max-w-none sm:grid-cols-3 sm:gap-x-[34px] sm:gap-y-8 lg:gap-y-[72px]">{catalogItems.map((nft, index) => <NftCard nft={nft} featuredRow={index < 3} staggeredMobile={index % 2 === 1} priority={index < 2} key={nft.id} />)}</ul>}
            </div>
            </div>
            {catalog.data && !catalogPayloadInvalid && catalogItems.length > 0 && pageCount > 1 && <nav aria-label="Paginação do catálogo" className="mt-10 flex items-center justify-center gap-2 lg:mt-0 lg:justify-end">
              {search.page > 1 && <Button variant="ghost" size="icon" aria-label="Página anterior" onClick={() => goToPage(search.page - 1)} className="size-[35px] rounded-[4px] border border-[#3f2319] bg-transparent p-0 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]"><ChevronLeft size={18} strokeWidth={1.5} /></Button>}
              {Array.from({ length: Math.min(4, pageCount) }, (_, index) => {
                const page = firstVisiblePage + index
                const current = page === search.page
                return <Button key={page} variant={current ? 'default' : 'ghost'} size="icon" aria-label={`Página ${page}`} aria-current={current ? 'page' : undefined} onClick={() => goToPage(page)} className={current
                  ? 'size-[35px] rounded-[4px] border border-[#d28a4c] bg-[#d28a4c] p-0 text-[18px] font-bold leading-4 text-[#140d0a] hover:bg-[#e89b55] hover:text-[#140d0a]'
                  : 'size-[35px] rounded-[4px] border border-[#3f2319] bg-transparent p-0 text-[18px] font-normal leading-4 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]'}>{page}</Button>
              })}
              {search.page < pageCount && <Button variant="ghost" size="icon" aria-label="Próxima página" onClick={() => goToPage(search.page + 1)} className="size-[35px] rounded-[4px] border border-[#3f2319] bg-transparent p-0 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]"><ChevronRight size={18} strokeWidth={1.5} /></Button>}
            </nav>}
          </div>
        </div>
      </section>
      <HomeSections />
    </main>
  )
}
