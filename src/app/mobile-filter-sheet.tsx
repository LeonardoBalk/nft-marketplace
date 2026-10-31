import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { catalogCategories, catalogNetworks, priceBounds, selectedCategories, toggleCategory } from '../features/catalog/filters'
import type { CatalogFacets, CatalogSearch } from '../features/catalog/contracts'

type FilterPatch = Partial<Pick<CatalogSearch, 'category' | 'network' | 'minPrice' | 'maxPrice'>>

const chipClass = (active: boolean) => `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${active ? 'border-[#d28a4c] bg-[#d28a4c]/15 font-bold text-[#e89b55]' : 'border-[#3f2319] text-[#cfb28c] hover:border-[#d28a4c]'}`

const formatEth = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function MobileFilterSheet({ search, facets, total, onChange, onClose, onShowResults }: {
  search: CatalogSearch
  facets?: CatalogFacets
  total?: number
  onChange: (patch: FilterPatch) => void
  onClose: () => void
  onShowResults: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const committedRange: [number, number] = [Number(search.minPrice) || priceBounds.min, Number(search.maxPrice) || priceBounds.defaultMax]
  const [range, setRange] = useState<[number, number]>(committedRange)

  // folha aberta: foco entra nela e a página atrás para de rolar
  useEffect(() => {
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  useEffect(() => {
    setRange([Number(search.minPrice) || priceBounds.min, Number(search.maxPrice) || priceBounds.defaultMax])
  }, [search.minPrice, search.maxPrice])

  // o slider só consulta ao soltar: arrastar não pode disparar uma busca por pixel
  const commitRange = () => {
    if (range[0] === committedRange[0] && range[1] === committedRange[1]) return
    onChange({ minPrice: range[0].toFixed(2), maxPrice: range[1].toFixed(2) })
  }

  // tab circula dentro da folha e esc fecha, como em qualquer diálogo
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const hasFilters = Boolean(search.category || search.network || search.minPrice || search.maxPrice)
  const resultLabel = total === undefined ? 'Ver resultados' : `Ver ${total} ${total === 1 ? 'resultado' : 'resultados'}`

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[#140d0a]/75 backdrop-blur-[2px]" />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title" onKeyDown={trapFocus} className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[40px] bg-[#241612] shadow-[0_-10px_30px_rgba(10,6,4,0.45)]">
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
          <h2 id="filter-sheet-title" className="text-[18px] font-bold leading-5 text-[#f5f1eb]">Filtros</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar filtros" className="inline-flex size-[35px] cursor-pointer items-center justify-center rounded-full border border-[#55321f] text-[#f5f1eb] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><X size={18} strokeWidth={2} aria-hidden="true" /></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto overscroll-contain px-6 pb-6">
          <section aria-labelledby="sheet-collections-title" className="flex flex-col gap-3">
            <h3 id="sheet-collections-title" className="text-[15px] font-bold leading-4 text-[#f5f1eb]">Coleções</h3>
            <div className="flex flex-wrap gap-2">
              {catalogCategories.map((category) => {
                const active = selectedCategories(search).includes(category)
                const count = facets?.categories.find((facet) => facet.name === category)?.count
                return <button key={category} type="button" aria-pressed={active} onClick={() => onChange({ category: toggleCategory(search, category) })} className={chipClass(active)}>{category}{count !== undefined && <span className="text-[11px] font-normal tabular-nums text-[#b39463]">{count}</span>}</button>
              })}
            </div>
          </section>

          <section aria-labelledby="sheet-price-title" className="flex flex-col gap-3">
            <h3 id="sheet-price-title" className="text-[15px] font-bold leading-4 text-[#f5f1eb]">Faixa de preço</h3>
            <div className="relative mx-1 h-[21px]">
              <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#68422e]" />
              <div className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#d28a4c]" style={{ left: `${(range[0] / priceBounds.max) * 100}%`, right: `${100 - (range[1] / priceBounds.max) * 100}%` }} />
              <label className="sr-only" htmlFor="sheet-minimum-price">Preço mínimo em ETH</label>
              <input id="sheet-minimum-price" type="range" min={priceBounds.min} max={priceBounds.max} step="0.01" value={range[0]} onChange={(event) => setRange((current) => [Math.min(Number(event.target.value), current[1] - 0.01), current[1]])} onPointerUp={commitRange} onKeyUp={commitRange} className="price-range absolute inset-0 z-10" />
              <label className="sr-only" htmlFor="sheet-maximum-price">Preço máximo em ETH</label>
              <input id="sheet-maximum-price" type="range" min={priceBounds.min} max={priceBounds.max} step="0.01" value={range[1]} onChange={(event) => setRange((current) => [current[0], Math.max(Number(event.target.value), current[0] + 0.01)])} onPointerUp={commitRange} onKeyUp={commitRange} className="price-range absolute inset-0 z-20" />
            </div>
            <p className="text-sm leading-5 text-[#cfb28c]">{formatEth(range[0])} – {formatEth(range[1])} ETH</p>
          </section>

          <section aria-labelledby="sheet-network-title" className="flex flex-col gap-3">
            <h3 id="sheet-network-title" className="text-[15px] font-bold leading-4 text-[#f5f1eb]">Rede</h3>
            <div className="flex flex-wrap gap-2">
              {catalogNetworks.map((network) => {
                const active = search.network === network.value
                const count = facets?.networks.find((facet) => facet.value === network.value)?.count
                return <button key={network.value} type="button" aria-pressed={active} onClick={() => onChange({ network: active ? '' : network.value })} className={chipClass(active)}>{network.label}{count !== undefined && <span className="text-[11px] font-normal tabular-nums text-[#b39463]">{count}</span>}</button>
              })}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[#3f2319] px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <button type="button" disabled={!hasFilters} onClick={() => onChange({ category: '', network: '', minPrice: '', maxPrice: '' })} className="h-[52px] flex-1 cursor-pointer rounded-[40px] border border-[#d28a4c] text-sm font-bold text-[#e89b55] transition-colors hover:bg-[#d28a4c]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:cursor-default disabled:border-[#3f2319] disabled:text-[#7a5a44]">Limpar</button>
          {/* o total vem da consulta já filtrada: muda a cada toque, sem a folha fechar */}
          <button type="button" onClick={onShowResults} aria-live="polite" className="h-[52px] flex-[2] cursor-pointer rounded-[40px] bg-[linear-gradient(137.05deg,rgba(210,138,76,0.45)_-24.6%,#d28a4c_100%)] text-sm font-bold text-[#140d0a] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]">{resultLabel}</button>
        </div>
      </div>
    </div>
  )
}
