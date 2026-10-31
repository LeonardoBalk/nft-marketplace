import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { NftCard, NftCardSkeleton } from './nft-card'
import { relatedNftsQuery } from './queries'
import type { NftSummary } from './contracts'

const perPage = 5

export function RelatedCarousel({ nftId, title, className = '' }: { nftId: string; title: string; className?: string }) {
  const related = useQuery(relatedNftsQuery(nftId))
  const [page, setPage] = useState(0)
  const headingId = useId()
  const items: NftSummary[] = related.data ?? []
  const pageCount = Math.max(1, Math.ceil(items.length / perPage))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = items.slice(currentPage * perPage, currentPage * perPage + perPage)

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="flex flex-col gap-3">
        <h2 id={headingId} className="text-[17px] font-bold leading-4 text-[#e89b55]">{title}</h2>
        <span aria-hidden="true" className="h-px w-full bg-[#d28a4c]" />
      </div>
      {related.isError
        ? <p className="mt-8 text-sm text-[#cfb28c]">Não foi possível carregar outras peças da coleção.</p>
        : <>
          <ul className="mt-8 grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-5">
            {related.isPending
              ? Array.from({ length: perPage }, (_, index) => <NftCardSkeleton key={index} />)
              : visible.map((item) => <NftCard key={item.id} nft={item} />)}
          </ul>
          {pageCount > 1 && <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-label={`Ver página ${index + 1} de ${pageCount}`} aria-current={index === currentPage} onClick={() => setPage(index)} className={`size-3 cursor-pointer rounded-full border-[1.3px] border-[#d28a4c] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${index === currentPage ? 'bg-[#d28a4c]' : 'bg-transparent hover:bg-[#d28a4c]/40'}`} />)}
          </div>}
        </>}
    </section>
  )
}
