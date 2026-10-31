import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '../favorites/favorite-button'
import type { NftSummary } from './contracts'

// a coluna da direita do frame mobile desce 32px; translate não empurra a linha da grade
// compact é o card do "mais desta coleção" no desktop: painel de 255px, arte de 212 e textos menores
type CompactArtworkLayout = 'portrait' | 'square' | 'square-short'

export function NftCard({ nft, featuredRow = false, staggeredMobile = false, compact = false, compactArtworkLayout = 'square' }: { nft: NftSummary; featuredRow?: boolean; staggeredMobile?: boolean; compact?: boolean; compactArtworkLayout?: CompactArtworkLayout }) {
  const compactPanelLayout = compactArtworkLayout === 'portrait'
    ? 'xl:w-[219px] xl:px-0 xl:pb-2 xl:pt-1'
    : compactArtworkLayout === 'square-short'
      ? 'xl:w-[219px] xl:px-1 xl:pb-7 xl:pt-4'
      : 'xl:w-[220px] xl:px-1 xl:pb-6 xl:pt-5'
  const compactImageLayout = compactArtworkLayout === 'portrait'
    ? 'xl:ml-5 xl:mt-0 xl:h-[243px] xl:w-[190px] xl:aspect-auto xl:rounded-[11px]'
    : compactArtworkLayout === 'square-short'
      ? 'xl:mt-0 xl:h-[213px] xl:w-[213px] xl:aspect-auto xl:rounded-[13px]'
      : 'xl:mt-0 xl:h-[212px] xl:w-[212px] xl:aspect-auto xl:rounded-[13px]'
  const compactItemWidth = compactArtworkLayout === 'square' ? 'xl:w-[220px]' : 'xl:w-[219px]'

  return (
    <li className={`group/card relative min-w-0 ${staggeredMobile ? 'translate-y-8 sm:translate-y-0' : ''} ${compact ? compactItemWidth : featuredRow ? 'lg:h-[356px]' : 'lg:h-[350px]'}`}>
      <Link className="group flex flex-col gap-2 rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d99558] lg:gap-3 lg:rounded-none" to="/nft/$nftId" params={{ nftId: nft.id }}>
        <div className={`relative flex h-[200px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(143.28deg,#241612_-12%,#2f1d15_106.59%)] px-1 lg:items-start lg:justify-start lg:gap-[10px] lg:rounded-none lg:bg-[#241612] lg:bg-none ${compact ? `lg:h-[255px] ${compactPanelLayout}` : 'lg:h-[300px] lg:max-w-[258px] lg:pb-7 lg:pt-6'}`}>
          <img className={`block aspect-square w-full max-w-[168px] shrink-0 rounded-[16px] object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none ${compact ? `lg:max-w-none ${compactImageLayout}` : 'lg:max-w-[250px] lg:rounded-[15px]'}`} src={nft.artwork} alt={nft.name} loading="lazy" width="250" height="250" />
          {/* selo do frame mobile: retângulo reto encostado na borda do card */}
          {nft.rarity === 'RARO' && <span className="absolute left-0 top-4 inline-flex h-8 w-[68px] items-center bg-[#d28a4c] pl-2 text-[13px] font-medium leading-4 text-[#140d0a] lg:hidden">RARO</span>}
        </div>
        <div className={`flex flex-col pl-2 lg:pl-0 ${compact ? 'lg:gap-0' : featuredRow ? 'lg:gap-3' : 'lg:gap-[6px]'}`}>
          <h3 className={`truncate text-[15px] font-normal leading-5 text-[#f5f1eb] transition-colors group-hover:text-[#e89b55] ${compact ? '' : 'lg:text-base lg:leading-4'}`}>{nft.name}</h3>
          <p className={`flex flex-wrap items-baseline gap-x-2 text-base font-bold leading-4 text-[#e89b55] lg:h-4 lg:flex-nowrap lg:gap-3 lg:overflow-visible ${compact ? '' : 'lg:text-[18px]'}`}>{nft.priceEth} ETH{nft.oldPriceEth && <span className="text-base font-normal leading-4 text-[#b39463] lg:text-[18px]">{nft.oldPriceEth} ETH</span>}</p>
        </div>
      </Link>
      {/* fora do Link: um botão dentro de uma âncora não é html válido nem navegável por teclado */}
      {/* no desktop o coração aparece no hover ou no foco; peça já favoritada mostra o estado sempre */}
      <FavoriteButton nftId={nft.id} nftName={nft.name} size={15} className={`absolute right-[11px] top-3 size-7 rounded-full lg:right-3 lg:size-8 lg:opacity-0 lg:transition-opacity lg:group-hover/card:opacity-100 lg:focus-visible:opacity-100 lg:aria-pressed:opacity-100 ${compact ? 'lg:top-8' : 'lg:top-9'}`} />
    </li>
  )
}

export function NftCardSkeleton({ staggeredMobile = false }: { staggeredMobile?: boolean }) {
  return (
    <li className={`min-w-0 lg:max-w-[258px] ${staggeredMobile ? 'translate-y-8 sm:translate-y-0' : ''}`} aria-hidden="true">
      <div className="flex h-[200px] w-full items-center justify-center rounded-[20px] bg-[#241612] px-1 lg:h-[300px] lg:items-start lg:rounded-none lg:pb-7 lg:pt-6">
        <Skeleton className="aspect-square w-full max-w-[168px] rounded-[16px] lg:max-w-[250px] lg:rounded-[15px]" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/3" />
    </li>
  )
}
