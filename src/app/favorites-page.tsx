import { useQueries } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { Button } from '../components/ui/button'
import { NftCard, NftCardSkeleton } from '../features/catalog/nft-card'
import { nftQuery } from '../features/catalog/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { useFavorites } from '../features/favorites/queries'
import { SiteFooter } from './site-footer'

// quatro colunas de 258px no desktop, como o card do catálogo: 12 fecham três linhas
const pageSize = 12
const pageButton = 'size-[35px] rounded-[4px] border p-0'
const idleButton = `${pageButton} border-[#3f2319] bg-transparent text-[18px] font-normal leading-4 text-[#f5f1eb] hover:border-[#d28a4c] hover:bg-[#241612] hover:text-[#e89b55]`
const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 sm:grid-cols-3 sm:gap-x-[34px] sm:gap-y-8 sm:pb-0 lg:grid-cols-[repeat(4,258px)] lg:justify-between lg:gap-y-[72px]'

export function FavoritesPage() {
  const { page } = useSearch({ from: '/favoritos' })
  const navigate = useNavigate()
  const { nftIds, isPending, isError } = useFavorites()
  // o favorito mais recente vem primeiro: quem acabou de salvar encontra a peça no topo
  const ordered = [...nftIds].reverse()
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize))
  // remover o último item de uma página não pode deixar a tela vazia
  const currentPage = Math.min(page, pageCount)
  const pageIds = ordered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const pageItems = useQueries({
    queries: pageIds.map((nftId) => nftQuery(nftId)),
    // só a página atual é buscada; uma peça que saiu do catálogo não derruba a lista
    combine: (results) => ({ items: results.flatMap((result) => (result.data ? [result.data] : [])), loading: results.some((result) => result.isPending) }),
  })

  const goToPage = (next: number) => {
    void navigate({ to: '/favoritos', search: { page: next }, resetScroll: false })
    document.getElementById('favorites-title')?.scrollIntoView({ block: 'start' })
  }

  return <>
    <main className="mx-auto min-h-[60vh] max-w-[1200px] scroll-mt-8 px-6 pb-10 pt-8 sm:px-8 xl:px-0">
      <nav aria-label="Trilha de navegação" className="hidden text-[15px] font-bold leading-4 md:block">
        <Link to="/" search={defaultCatalogSearch} className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Início</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <span aria-current="page">Favoritos</span>
      </nav>

      <div className="flex items-end justify-between gap-4 md:mt-6">
        <div className="flex flex-col gap-2">
          <h1 id="favorites-title" className="scroll-mt-8 text-xl font-bold leading-6 text-[#f5f1eb] md:text-[28px] md:leading-[37px]">Favoritos</h1>
          <p className="text-sm leading-5 text-[#cfb28c]">{nftIds.length > 0 ? `${nftIds.length} ${nftIds.length === 1 ? 'peça salva' : 'peças salvas'} para decidir depois.` : 'As peças que você guardar aparecem aqui.'}</p>
        </div>
        {nftIds.length > 0 && <Button asChild variant="ghost" className="hidden h-9 min-h-0 shrink-0 rounded-[6px] border border-[#d28a4c] px-4 text-sm font-bold text-[#e89b55] hover:bg-[#d28a4c]/10 sm:inline-flex"><Link to="/" search={defaultCatalogSearch} hash="catalogo">Explorar mais</Link></Button>}
      </div>
      <span aria-hidden="true" className="mt-4 block h-px w-full bg-[#d28a4c]/30" />

      {isError
        ? <div role="alert" className="mt-8 rounded-[14px] border border-[#6e4b38] p-6"><p>Não foi possível carregar seus favoritos.</p></div>
        : isPending || (pageItems.loading && pageItems.items.length === 0)
          ? <><p className="sr-only" role="status">Carregando favoritos...</p><ul className={`mt-8 ${gridClass}`}>{Array.from({ length: Math.min(pageSize, Math.max(pageIds.length, 3)) }, (_, index) => <NftCardSkeleton key={index} staggeredMobile={index % 2 === 1} />)}</ul></>
          : nftIds.length === 0
            ? <div className="mx-auto mt-10 flex max-w-[420px] flex-col items-center gap-4 rounded-[14px] bg-[#241612] px-6 py-10 text-center">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#d28a4c]"><Heart size={22} strokeWidth={1.8} /></span>
              <p className="text-base font-bold leading-5 text-[#f5f1eb]">Você ainda não favoritou nenhum NFT.</p>
              <p className="text-sm leading-5 text-[#cfb28c]">Toque no coração de uma peça para guardá-la aqui.</p>
              <Button asChild className="mt-2 h-10 min-h-0 rounded-[6px] px-5 font-bold"><Link to="/" search={defaultCatalogSearch} hash="catalogo">Explorar o catálogo</Link></Button>
            </div>
            : <ul className={`mt-8 ${gridClass}`}>{pageItems.items.map((nft, index) => <NftCard nft={nft} staggeredMobile={index % 2 === 1} key={nft.id} />)}</ul>}

      {pageCount > 1 && !isError && <nav aria-label="Paginação dos favoritos" className="mt-10 flex items-center justify-center gap-2 lg:justify-end">
        {currentPage > 1 && <Button variant="ghost" size="icon" aria-label="Página anterior" onClick={() => goToPage(currentPage - 1)} className={idleButton}><ChevronLeft size={18} strokeWidth={1.5} /></Button>}
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => {
          const current = number === currentPage
          return <Button key={number} variant={current ? 'default' : 'ghost'} size="icon" aria-label={`Página ${number}`} aria-current={current ? 'page' : undefined} onClick={() => goToPage(number)} className={current ? `${pageButton} border-[#d28a4c] bg-[#d28a4c] text-[18px] font-bold leading-4 text-[#140d0a] hover:bg-[#e89b55] hover:text-[#140d0a]` : idleButton}>{number}</Button>
        })}
        {currentPage < pageCount && <Button variant="ghost" size="icon" aria-label="Próxima página" onClick={() => goToPage(currentPage + 1)} className={idleButton}><ChevronRight size={18} strokeWidth={1.5} /></Button>}
      </nav>}
    </main>
    <SiteFooter />
  </>
}
