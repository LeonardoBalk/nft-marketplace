import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { LogIn, LogOut, Search, ShoppingCart } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAuthSession, useLogout } from '../features/auth/queries'
import { useAuthModal } from '../features/auth/modal-context'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { useCart } from '../features/cart/queries'

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const routeQuery = useRouterState({ select: (state) => String(state.location.search.q ?? '') })
  const [searchQuery, setSearchQuery] = useState(routeQuery)
  const { itemCount } = useCart()
  const { data: user } = useAuthSession()
  const logout = useLogout()
  const { openAuth } = useAuthModal()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const marketActive = pathname.startsWith('/nft/') || pathname === '/carrinho' || pathname === '/checkout'

  useEffect(() => {
    setSearchQuery(routeQuery)
  }, [routeQuery])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim().slice(0, 80)
    setSearchOpen(false)
    void navigate({ to: '/', search: { ...defaultCatalogSearch, q: query }, hash: 'catalogo' })
  }

  return (
    <header className="relative z-10 mx-auto mt-6 max-w-[1200px] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#d28a4c]/40 after:content-['']">
      <div className="flex h-[45px] items-start justify-between gap-5 px-5 sm:px-8 xl:px-0">
        <Link to="/" search={defaultCatalogSearch} className="h-[34px] w-12 shrink-0 pt-[8px] text-sm font-bold tracking-[0.1em] text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] lg:w-40">KURIO</Link>
        <nav aria-label="Navegação principal" className="hidden h-[45px] w-[401px] flex-none items-start gap-10 text-base lg:flex">
          <Link to="/" search={defaultCatalogSearch} className={`relative h-[45px] pt-[2px] transition-colors ${marketActive ? 'text-[#f5f1eb] hover:text-[#e89b55]' : 'font-bold text-[#e89b55] hover:text-[#f5f1eb]'} after:absolute after:left-0 after:top-full after:h-[3px] after:w-full after:content-[''] ${marketActive ? 'after:hidden' : 'after:bg-[#d28a4c]'}`}>Início</Link>
          <Link to="/" search={defaultCatalogSearch} hash="catalogo" className={`relative h-[45px] pt-[2px] transition-colors ${marketActive ? 'font-bold text-[#e89b55] hover:text-[#f5f1eb] after:absolute after:left-0 after:top-full after:h-[3px] after:w-full after:bg-[#d28a4c] after:content-[\'\']' : 'text-[#f5f1eb] hover:text-[#e89b55]'}`}>Mercado</Link>
          <Link to="/" search={defaultCatalogSearch} hash="destaques" className="h-[45px] pt-[2px] text-[#f5f1eb] transition-colors hover:text-[#e89b55]">Criadores</Link>
          <Link to="/" search={defaultCatalogSearch} hash="diario" className="h-[45px] pt-[2px] text-[#f5f1eb] transition-colors hover:text-[#e89b55]">Aprenda</Link>
        </nav>
        <div className="flex h-[35px] w-auto flex-none items-center gap-3 lg:w-[159px] lg:justify-end lg:gap-7">
          <button type="button" aria-label={searchOpen ? 'Fechar busca' : 'Abrir busca'} aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)} className="inline-flex size-5 cursor-pointer items-center justify-center transition-colors hover:text-[#d28a4c] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><Search size={20} strokeWidth={2} /></button>
          <Link to="/carrinho" aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`} className="relative inline-flex h-6 w-[31px] flex-none items-center justify-center text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><ShoppingCart width={31} height={24} strokeWidth={2} />{itemCount > 0 && <span aria-hidden="true" className="absolute left-[15px] top-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#140d0a] bg-[#d28a4c] px-[2px] text-[10px] font-medium leading-none text-[#140d0a]">{itemCount}</span>}</Link>
          {user ? <Button type="button" disabled={logout.isPending} onClick={() => logout.mutate()} className="hidden h-[35px] max-w-[140px] min-h-0 flex-none gap-1 rounded-[6px] px-3 text-sm font-medium sm:inline-flex" title={`Sair de ${user.email}`}><LogOut size={18} strokeWidth={1.5} /><span className="truncate">Sair</span></Button> : <Button type="button" onClick={() => openAuth('login')} className="hidden h-[35px] w-[100px] min-h-0 flex-none gap-1 rounded-[6px] px-0 text-base font-medium sm:inline-flex"><LogIn size={20} strokeWidth={1.5} /> Entrar</Button>}
        </div>
      </div>
      {searchOpen && <form onSubmit={submitSearch} role="search" className="absolute right-0 top-full flex w-full max-w-sm gap-2 border border-[#4b3026] bg-[#241712] p-3 shadow-xl">
        <label htmlFor="header-search" className="sr-only">Buscar NFTs</label>
        <input id="header-search" name="q" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} maxLength={80} autoFocus placeholder="Buscar NFTs" className="min-w-0 flex-1 border border-[#5a392c] bg-[#140d0a] px-3 text-sm outline-none focus-visible:border-[#d28a4c]" />
        <Button type="submit" size="sm">Buscar</Button>
      </form>}
    </header>
  )
}
