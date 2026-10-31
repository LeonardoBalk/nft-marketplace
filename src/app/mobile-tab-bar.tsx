import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { MouseEvent } from 'react'
import { Heart, ShoppingCart, User } from 'lucide-react'
import { useAuthSession } from '../features/auth/queries'
import { useAuthModal } from '../features/auth/modal-context'
import { useCart } from '../features/cart/queries'
import { lastCatalogSearch } from '../features/catalog/last-search'

// recorte do frame: círculo de raio 47 em volta do botão de 65px, com ombros de raio 18
const notchPath = 'M0 0H37.13A18 18 0 0 1 54.54 13.43A47 47 0 0 0 145.46 13.43A18 18 0 0 1 162.87 0H200V200H0Z'

// ícone de scanner do frame; o lucide não tem um com esses cantos arredondados
function ScannerIcon() {
  return (
    <svg width="27" height="24" viewBox="0 0 27 24" fill="currentColor" aria-hidden="true">
      <path d="M13.3819 12.8913C9.28498 12.8913 5.18803 12.8913 1.09108 12.8906C0.961448 12.8906 0.827342 12.8943 0.702176 12.8667C0.25441 12.7684 -0.0480741 12.337 0.00631347 11.893C0.060701 11.4482 0.439924 11.1114 0.913021 11.1092C1.98364 11.1032 3.055 11.1062 4.12561 11.1062C11.3234 11.1062 18.5212 11.107 25.719 11.1084C25.8575 11.1084 26.0013 11.1047 26.1347 11.136C26.5743 11.2396 26.8641 11.6553 26.8179 12.0919C26.7702 12.5389 26.3947 12.8868 25.9246 12.8891C24.7139 12.8965 23.504 12.8928 22.2933 12.8928C19.3228 12.8928 16.3524 12.8928 13.3827 12.8928C13.3819 12.8928 13.3819 12.8921 13.3819 12.8913Z" />
      <path d="M10.5553 24.0002C9.20453 23.7976 7.81951 23.7216 6.51123 23.3654C3.76503 22.6167 2.19524 20.7243 1.7445 17.9274C1.57761 16.8926 1.47479 15.8473 1.35559 14.8057C1.28332 14.1762 1.58357 13.7634 2.13191 13.6956C2.67653 13.6286 3.07587 13.9817 3.13622 14.5278C3.26586 15.708 3.35601 16.8978 3.57877 18.0615C3.98109 20.1633 5.70212 21.6288 7.83664 21.8165C8.84617 21.9052 9.8542 22.0177 10.8607 22.1339C11.5953 22.2188 11.9343 23.0347 11.4948 23.6314C11.3048 23.89 11.0805 23.9637 10.5553 24.0002Z" />
      <path d="M25.4463 9.39819C25.4307 9.53528 25.4321 9.67758 25.3949 9.8087C25.3077 10.1186 25.0015 10.3779 24.7422 10.3831C24.3004 10.3921 23.7998 10.0643 23.6977 9.65001C23.6247 9.35572 23.6225 9.0443 23.5822 8.74107C23.4571 7.78444 23.3967 6.81366 23.1881 5.87566C22.7604 3.95571 21.5326 2.73758 19.6142 2.32259C18.4743 2.07599 17.2971 1.99999 16.1363 1.84726C16.0075 1.83013 15.8756 1.82417 15.7504 1.79213C15.331 1.68559 15.0583 1.287 15.1112 0.870521C15.17 0.407854 15.5269 0.0539627 15.9732 0.0859992C17.5042 0.195519 19.0427 0.30653 20.5119 0.776646C22.8633 1.52988 24.3451 3.15778 24.9054 5.53965C25.2012 6.79876 25.3018 8.10332 25.4903 9.38701C25.4761 9.39148 25.4612 9.39446 25.4463 9.39819Z" />
      <path d="M25.4224 14.8807C25.2988 16.1673 25.2086 17.5807 24.8167 18.9441C24.0777 21.5145 21.8962 23.2891 19.2372 23.5491C18.1554 23.6549 17.0781 23.8106 15.9992 23.944C15.617 23.9917 15.2013 23.6229 15.1208 23.1647C15.0404 22.7058 15.3287 22.255 15.7832 22.1939C16.3263 22.1202 16.8776 22.106 17.4208 22.033C18.3223 21.913 19.2565 21.8803 20.1133 21.6083C21.97 21.0197 23.007 19.6638 23.279 17.7453C23.4235 16.7254 23.5308 15.7002 23.6336 14.675C23.6932 14.082 24.0799 13.6685 24.6007 13.6983C25.1043 13.7273 25.4515 14.1744 25.4224 14.8807Z" />
      <path d="M1.3295 9.27513C1.52768 7.95493 1.62081 6.60791 1.9449 5.319C2.60053 2.71063 4.34912 1.11849 6.95898 0.532893C8.1339 0.269151 9.34756 0.177512 10.5448 0.0173291C10.7266 -0.00725703 10.9226 -0.0087471 11.0984 0.0329749C11.5119 0.130574 11.7548 0.509797 11.7153 0.940427C11.6736 1.39117 11.3681 1.69068 10.9285 1.73985C9.84748 1.86055 8.7642 1.97081 7.68688 2.1228C5.4108 2.44316 3.83356 4.02338 3.52363 6.28456C3.37536 7.36933 3.2569 8.45857 3.1295 9.54632C3.07809 9.98441 2.70185 10.3122 2.24217 10.3063C1.79589 10.3003 1.41518 9.94492 1.39059 9.50833C1.38612 9.43457 1.38985 9.36007 1.38985 9.28556C1.36973 9.28184 1.34961 9.27886 1.3295 9.27513Z" />
    </svg>
  )
}

export function hidesMobileNav(pathname: string): boolean {
  return pathname.startsWith('/nft/') || pathname.startsWith('/pedido/') || pathname === '/carrinho' || pathname === '/checkout'
}

const tabClass = 'absolute inline-flex size-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]'

export function MobileTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const href = useRouterState({ select: (state) => state.location.href })
  const { itemCount } = useCart()
  const { data: user } = useAuthSession()
  const { openAuth } = useAuthModal()
  const navigate = useNavigate()

  // detalhe, carrinho e pagamento têm a própria barra no rodapé; a confirmação é só o recibo
  if (hidesMobileNav(pathname)) return null

  // o botão central abre a busca: na inicial o foco vai direto, ainda no toque, para o teclado subir;
  // vindo de outra tela, foca assim que o catálogo monta
  const openSearch = (event: MouseEvent<HTMLAnchorElement>) => {
    const field = document.getElementById('buscar')
    if (pathname === '/' && field) {
      event.preventDefault()
      field.focus()
      return
    }
    event.preventDefault()
    void navigate({ to: '/', search: lastCatalogSearch() }).then(() => requestAnimationFrame(() => document.getElementById('buscar')?.focus()))
  }
  const tone = (active: boolean) => (active ? 'text-[#e89b55]' : 'text-[#cfb28c] hover:text-[#e89b55]')

  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-30 h-[calc(126px+env(safe-area-inset-bottom))] md:hidden">
      {/* drop-shadow segue o recorte; box-shadow desenharia um retângulo */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[31px] flex drop-shadow-[0_-10px_30px_rgba(10,6,4,0.45)]">
        <div className="flex-1 rounded-tl-[30px] bg-[#241612]" />
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMin slice" className="-mx-px h-full w-[202px] shrink-0 fill-[#241612]"><path d={notchPath} /></svg>
        <div className="flex-1 rounded-tr-[30px] bg-[#241612]" />
      </div>

      <div className="relative h-full">
        <Link to="/" search={lastCatalogSearch()} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined} className={`${tabClass} left-[calc(8.7%+10px)] top-[59px] ${tone(pathname === '/')}`}>
          <svg width="16" height="17" viewBox="0 0 16 17" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M5.52898 15.6445V13.0963C5.52898 12.4459 6.06014 11.9186 6.71536 11.9186H9.11051C9.42516 11.9186 9.72692 12.0427 9.94941 12.2635C10.1719 12.4844 10.2969 12.784 10.2969 13.0963V15.6445C10.2949 15.9149 10.4017 16.1749 10.5936 16.3668C10.7856 16.5587 11.0467 16.6667 11.3191 16.6667H12.9532C13.7164 16.6686 14.449 16.369 14.9893 15.834C15.5297 15.299 15.8333 14.5725 15.8333 13.8149V6.55572C15.8333 5.94372 15.5601 5.3632 15.0872 4.97056L9.52835 0.563224C8.56138 -0.209532 7.17593 -0.184582 6.23783 0.622482L0.805844 4.97056C0.310617 5.35163 0.0146269 5.93386 0 6.55572V13.8074C0 15.3865 1.28948 16.6667 2.88014 16.6667H4.47691C5.04269 16.6667 5.5025 16.2135 5.5066 15.6519L5.52898 15.6445Z" />
          </svg>
        </Link>
        <Link to="/favoritos" search={{ page: 1 }} aria-label="Favoritos" aria-current={pathname === '/favoritos' ? 'page' : undefined} className={`${tabClass} left-[calc(26.09%+10px)] top-[59px] ${tone(pathname === '/favoritos')}`}><Heart size={20} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /></Link>

        {/* o ícone é o do frame; a ação continua sendo a busca do catálogo, sem prometer câmera */}
        <Link to="/" search={lastCatalogSearch()} hash="buscar" activeOptions={{ exact: true, includeHash: true, includeSearch: false }} onClick={openSearch} aria-label="Explorar coleções" className="absolute left-1/2 top-0 inline-flex size-[65px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(210,138,76,0.4)_-16.92%,#d28a4c_109.23%)] text-[#f5f1eb] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><ScannerIcon /></Link>

        <Link to="/carrinho" aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`} aria-current={pathname === '/carrinho' ? 'page' : undefined} className={`${tabClass} left-[calc(70.53%+10px)] top-[59px] ${tone(pathname === '/carrinho')}`}>
          <ShoppingCart size={20} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
          {itemCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#241612] bg-[#d28a4c] px-[2px] text-[10px] font-medium leading-none text-[#140d0a]">{itemCount}</span>}
        </Link>
        {user
          ? <Link to="/perfil" aria-label="Perfil" aria-current={pathname === '/perfil' ? 'page' : undefined} className={`${tabClass} left-[calc(85.51%+10px)] top-[59px] ${tone(pathname === '/perfil')}`}><User size={20} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /></Link>
          : <button type="button" aria-label="Entrar" onClick={() => openAuth('login', href)} className={`${tabClass} left-[calc(85.51%+10px)] top-[59px] ${tone(false)}`}><User size={20} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /></button>}
      </div>
    </nav>
  )
}
