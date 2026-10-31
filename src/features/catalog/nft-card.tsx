import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftSummary } from './contracts'

export function NftCard({ nft, featuredRow = false }: { nft: NftSummary; featuredRow?: boolean }) {
  return (
    <li className={`min-w-0 ${featuredRow ? 'lg:h-[356px]' : 'lg:h-[350px]'}`}>
      <Link className="group flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d99558]" to="/nft/$nftId" params={{ nftId: nft.id }}>
        <div className="flex h-[300px] w-full max-w-[258px] flex-row items-start gap-[10px] bg-[#241612] px-1 pb-7 pt-6">
          <img className="block aspect-square w-full max-w-[250px] shrink-0 rounded-[15px] object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none" src={nft.artwork} alt={nft.name} loading="lazy" width="250" height="250" />
        </div>
        <div className={`flex flex-col ${featuredRow ? 'gap-3' : 'gap-[6px]'}`}>
          <h3 className="truncate text-base font-normal leading-4 text-[#f5f1eb] transition-colors group-hover:text-[#e89b55]">{nft.name}</h3>
          <p className="flex h-4 items-baseline gap-3 overflow-visible text-[18px] font-bold leading-4 text-[#e89b55]">{nft.priceEth} ETH{nft.oldPriceEth && <span className="text-[18px] font-normal leading-4 text-[#b39463]">{nft.oldPriceEth} ETH</span>}</p>
        </div>
      </Link>
    </li>
  )
}

export function NftCardSkeleton() {
  return (
    <li className="min-w-0 max-w-[258px]" aria-hidden="true">
      <div className="flex h-[300px] w-full flex-row items-start gap-[10px] bg-[#241612] px-1 pb-7 pt-6">
        <Skeleton className="aspect-square w-full max-w-[250px] rounded-[15px]" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/3" />
    </li>
  )
}
