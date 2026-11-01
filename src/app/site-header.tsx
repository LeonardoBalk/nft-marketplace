import { Link, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useState, type FormEvent } from 'react'
import { LogIn, Search, ShoppingCart, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAuthSession } from '../features/auth/queries'
import { useAuthModal } from '../features/auth/modal-context'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { useCart } from '../features/cart/queries'
import { useCatalogSearchField } from '../features/catalog/use-catalog-search-field'

// o menu da conta (radix + posicionamento) só existe para quem entrou: fica fora do pacote da primeira tela
const AccountMenu = lazy(() => import('./account-menu').then((module) => ({ default: module.AccountMenu })))

// a barra do item ativo cruza o fio de 1px do header pelo meio: 3px com o fio na linha do centro
const navClass = (active: boolean) => `relative h-[45px] pt-[2px] transition-colors ${active ? "font-bold text-[#e89b55] hover:text-[#f5f1eb] after:absolute after:left-0 after:top-[calc(100%-2px)] after:z-10 after:h-[3px] after:w-full after:bg-[#d28a4c] after:content-['']" : 'text-[#f5f1eb] hover:text-[#e89b55]'}`

const exactAnchor = { exact: true, includeHash: true, includeSearch: false }

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const searchField = useCatalogSearchField()
  const { itemCount } = useCart()
  const { data: user } = useAuthSession()
  const { openAuth } = useAuthModal()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hash = useRouterState({ select: (state) => state.location.hash })
  // início na inicial; mercado no catálogo e no fluxo de compra; perfil, carteiras e favoritos não acendem nenhum
  const onCatalogAnchor = pathname === '/' && hash === 'catalogo'
  const homeActive = pathname === '/' && !onCatalogAnchor
  const marketActive = onCatalogAnchor || pathname.startsWith('/nft/') || pathname === '/carrinho' || pathname === '/checkout'

  // enter fecha o campo e leva aos resultados; a busca em si já aconteceu enquanto digitava
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchOpen(false)
    searchField.submit()
  }

  return (
    // no mobile a navegação é a tab bar e a busca mora no topo do catálogo
    <header className="relative z-10 mx-auto mt-6 hidden max-w-[1200px] md:block after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#d28a4c]/40 after:content-['']">
      <div className="flex h-[45px] items-start justify-between gap-5 px-5 sm:px-8 xl:px-0">
        <Link to="/" search={defaultCatalogSearch} className="h-[34px] w-12 shrink-0 pt-[8px] text-sm font-bold tracking-[0.1em] text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] lg:w-40">KURIO</Link>
        <nav aria-label="Navegação principal" className="hidden h-[45px] w-[401px] flex-none items-start gap-10 text-base lg:flex">
          {/* manter o link ativo alinhado ao destaque visual */}
          <Link to="/" search={defaultCatalogSearch} activeOptions={exactAnchor} aria-current={homeActive ? 'page' : undefined} className={navClass(homeActive)}>Início</Link>
          <Link to="/" search={defaultCatalogSearch} hash="catalogo" activeOptions={exactAnchor} aria-current={marketActive ? 'page' : undefined} className={navClass(marketActive)}>Mercado</Link>
          {/* fora do escopo: aparecem como no desenho, sem hover e sem link; o aviso fica para leitor de tela */}
          {['Criadores', 'Aprenda'].map((label) => <span key={label} aria-disabled="true" className="h-[45px] pt-[2px] text-[#f5f1eb]">{label}<span className="sr-only"> (fora do escopo desta entrega)</span></span>)}
        </nav>
        <div className="flex h-[35px] w-auto flex-none items-center gap-3 lg:w-[159px] lg:justify-end lg:gap-7">
          <button type="button" aria-label={searchOpen ? 'Fechar busca' : 'Abrir busca'} aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)} className="inline-flex size-5 cursor-pointer items-center justify-center transition-colors hover:text-[#d28a4c] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><Search size={20} strokeWidth={2} /></button>
          <Link to="/carrinho" aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`} className="relative inline-flex h-6 w-[31px] flex-none items-center justify-center text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><ShoppingCart width={31} height={24} strokeWidth={2} />{itemCount > 0 && <span aria-hidden="true" className="absolute left-[15px] top-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#140d0a] bg-[#d28a4c] px-[2px] text-[10px] font-medium leading-none text-[#140d0a]">{itemCount}</span>}</Link>
          {user ? <Suspense fallback={<span aria-hidden="true" className="size-[35px] rounded-full bg-[#2f1d15]" />}><AccountMenu user={user} /></Suspense> : <Button type="button" onClick={() => openAuth('login')} className="hidden h-[35px] w-[100px] min-h-0 flex-none gap-1 rounded-[6px] px-0 text-base font-medium sm:inline-flex"><LogIn size={20} strokeWidth={1.5} /> Entrar</Button>}
        </div>
      </div>
      {searchOpen && <form onSubmit={submitSearch} role="search" className="absolute right-0 top-full flex w-full max-w-sm items-center gap-2 border border-[#4b3026] bg-[#241712] p-3 shadow-xl">
        <label htmlFor="header-search" className="sr-only">Buscar NFTs</label>
        <input id="header-search" name="q" value={searchField.value} onChange={(event) => searchField.change(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }} maxLength={80} autoFocus placeholder="Buscar NFTs" enterKeyHint="search" autoComplete="off" className="h-9 min-w-0 flex-1 border border-[#5a392c] bg-[#140d0a] px-3 text-sm outline-none focus-visible:border-[#d28a4c]" />
        {searchField.value && <button type="button" aria-label="Limpar busca" onClick={searchField.clear} className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#b39463] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d99558]"><X size={16} strokeWidth={2} aria-hidden="true" /></button>}
      </form>}
    </header>
  )
}
