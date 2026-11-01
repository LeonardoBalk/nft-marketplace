import { formatEth } from '../shared/money/eth'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartLine, CartSummary } from '../features/cart/contracts'
import type { useApplyCoupon, useRemoveCartItem, useUpdateCartItem } from '../features/cart/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { lastCatalogSearch } from '../features/catalog/last-search'

const stepperButton = 'flex size-6 cursor-pointer items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#f5f1eb] transition-colors hover:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:cursor-not-allowed disabled:text-[#55321f] disabled:hover:border-[#3f2319]'

function MobileCartSkeleton() {
  return (
    <li className="flex h-[100px] overflow-hidden rounded-[14px] bg-[#241612]" aria-hidden="true">
      <Skeleton className="size-[100px] shrink-0 rounded-none" />
      <div className="flex flex-1 flex-col gap-2 pl-[9px] pt-[13px]"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-4 w-20" /></div>
    </li>
  )
}

export function MobileCart({ cart, items, isPending, isError, hasUnavailable, signedIn, updateItem, removeItem, coupon, couponCode, onCouponCodeChange, onApplyCoupon, onCheckout, errorOf }: {
  cart?: CartSummary
  items: CartLine[]
  isPending: boolean
  isError: boolean
  hasUnavailable: boolean
  signedIn: boolean
  updateItem: ReturnType<typeof useUpdateCartItem>
  removeItem: ReturnType<typeof useRemoveCartItem>
  coupon: ReturnType<typeof useApplyCoupon>
  couponCode: string
  onCouponCodeChange: (code: string) => void
  onApplyCoupon: (event: FormEvent<HTMLFormElement>) => void
  onCheckout: () => void
  errorOf: (error: unknown, fallback: string) => string
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()

  // voltar retorna à tela anterior; aberto direto pela url, cai no catálogo
  const goBack = () => {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/', search: lastCatalogSearch() })
  }

  return (
    <main className="flex min-h-dvh flex-col pt-8">
      <section aria-labelledby="cart-title" className="px-7">
        {/* título centrado no espaço à direita do voltar, como no frame (x 96 de 358) */}
        <div className="flex h-[44px] items-start">
          <button type="button" onClick={goBack} aria-label="Voltar" className="inline-flex size-[35px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#b39463] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" /></button>
          <h1 id="cart-title" className="mt-[9px] flex-1 text-center text-xl font-bold leading-4 text-[#f5f1eb]">Carrinho de NFTs</h1>
        </div>

        {isError
          ? <p role="alert" className="mt-3 text-sm text-[#ffb59c]">Não foi possível carregar seu carrinho. Atualize a página para tentar de novo.</p>
          : isPending
            ? <ul className="mt-3 flex flex-col gap-5" role="status" aria-label="Carregando carrinho">{Array.from({ length: 3 }, (_, index) => <MobileCartSkeleton key={index} />)}</ul>
            : items.length === 0
              ? <p className="mt-3 text-[15px] leading-6 text-[#cfb28c]">Seu carrinho está vazio. <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-[#e89b55] underline">Explore o mercado</Link> para escolher uma peça.</p>
              : <ul className="mt-3 flex flex-col gap-5">
                {items.map((line) => <li key={`${line.nft.id}:${line.edition}`} className="relative flex h-[100px] overflow-hidden rounded-[14px] bg-[#241612] shadow-[0_6px_20px_rgba(10,6,4,0.45)]">
                  <img src={line.nft.artwork} alt="" loading="lazy" width="100" height="100" className="size-[100px] shrink-0 object-cover" />
                  {/* o texto para antes do stepper: nomes longos truncam em vez de passar por baixo dele */}
                  <div className="flex min-w-0 flex-1 flex-col pl-[9px] pr-[94px] pt-[13px]">
                    <Link to="/nft/$nftId" params={{ nftId: line.nft.id }} className="truncate text-[15px] font-bold leading-4 text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">{line.nft.name}</Link>
                    <p className="mt-[6px] text-sm leading-4 text-[#cfb28c]">Edição: 1/{line.nft.edition}</p>
                    <p className="mt-[18px] text-[18px] font-bold leading-4 text-[#e89b55] tabular-nums">{line.lineTotalEth} ETH</p>
                  </div>
                  {/* no frame a lixeira cai sobre o "+" de um item só; aqui ela é um controle próprio, acima dele */}
                  <button type="button" aria-label={`Remover ${line.nft.name} do carrinho, ${line.edition}`} disabled={removeItem.isPending} onClick={() => removeItem.mutate({ nftId: line.nft.id, edition: line.edition })} className="absolute right-4 top-2 flex size-6 cursor-pointer items-center justify-center text-[#d28a4c] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:opacity-50"><Trash2 size={16} strokeWidth={1.5} aria-hidden="true" /></button>
                  <div className="absolute right-4 top-[38px] flex items-center">
                    {/* com 1 unidade o "−" fica apagado, como no frame: para tirar o item, a lixeira */}
                    <button type="button" aria-label={`Diminuir quantidade de ${line.nft.name}, ${line.edition}`} disabled={updateItem.isPending || line.quantity <= 1} onClick={() => updateItem.mutate({ nftId: line.nft.id, edition: line.edition, quantity: line.quantity - 1 })} className={stepperButton}><span aria-hidden="true" className="h-0.5 w-[9px] rounded-full bg-current" /></button>
                    <output aria-label={`Quantidade de ${line.nft.name}, ${line.edition}`} className="min-w-[33px] pt-[7px] text-center text-base leading-[22px] text-[#f5f1eb]">{line.quantity}</output>
                    <button type="button" aria-label={`Aumentar quantidade de ${line.nft.name}, ${line.edition}`} disabled={updateItem.isPending || line.quantity >= line.nft.editionAvailability[line.edition] || items.filter((other) => other.nft.id === line.nft.id).reduce((sum, other) => sum + other.quantity, 0) >= line.nft.available} onClick={() => updateItem.mutate({ nftId: line.nft.id, edition: line.edition, quantity: line.quantity + 1 })} className={`${stepperButton} text-[21px] leading-4`}><span aria-hidden="true">+</span></button>
                  </div>
                </li>)}
              </ul>}

        {updateItem.isError && <p role="alert" className="mt-3 text-xs text-[#ffb59c]">{errorOf(updateItem.error, 'Não foi possível alterar a quantidade.')}</p>}
        {removeItem.isError && <p role="alert" className="mt-3 text-xs text-[#ffb59c]">{errorOf(removeItem.error, 'Não foi possível remover o item.')}</p>}
        {hasUnavailable && <p role="alert" className="mt-3 text-xs text-[#ffb59c]">A disponibilidade mudou. Ajuste ou remova os itens indisponíveis antes de finalizar.</p>}
      </section>

      {/* resumo do frame: folha no rodapé, empurrada para baixo quando a lista é curta */}
      <section aria-labelledby="summary-title" className="mt-auto flex flex-col gap-8 rounded-t-[40px] bg-[#241612] px-6 pb-9 pt-6">
        <h2 id="summary-title" className="sr-only">Resumo da compra</h2>
        <div className="flex flex-col gap-3">
          <form onSubmit={onApplyCoupon}>
            <label htmlFor="cart-coupon-mobile" className="sr-only">Código promocional</label>
            <div className="flex h-[50px] items-center rounded-[40px] border border-[#3f2319] bg-[#241612] pl-4 shadow-[0_6px_20px_rgba(10,6,4,0.45)] focus-within:border-[#d28a4c]">
              <input id="cart-coupon-mobile" name="code" value={couponCode} onChange={(event) => onCouponCodeChange(event.target.value)} maxLength={32} placeholder="Digite o código promocional..." autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[13px] leading-[22px] text-[#f5f1eb] outline-none placeholder:text-[#b39463]" />
              {/* o botão cobre a borda do campo, como no frame */}
              {/* aceso mesmo vazio, como no frame: o envio sem código já não faz nada */}
              <button type="submit" disabled={coupon.isPending} className="-my-px -mr-px h-[50px] w-[97px] shrink-0 cursor-pointer rounded-[40px] bg-[linear-gradient(93.11deg,rgba(210,138,76,0.54)_-0.94%,#d28a4c_105.02%)] text-[15px] font-bold leading-4 text-[#f5f1eb] transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:cursor-not-allowed disabled:opacity-60">{coupon.isPending ? '…' : 'Aplicar'}</button>
            </div>
            {coupon.isError && <p role="alert" className="mt-2 text-xs text-[#ffb59c]">{errorOf(coupon.error, 'Não foi possível aplicar o cupom.')}</p>}
            {cart?.couponCode && <p role="status" className="mt-2 text-xs text-[#e89b55]">Cupom {cart.couponCode} aplicado.</p>}
          </form>
          {isPending ? <div role="status" aria-label="Carregando resumo da compra" className="flex flex-col gap-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-5 w-full" /><Skeleton className="h-7 w-full" /></div> : <>
          <div className="flex items-start justify-between text-[15px] leading-5 text-[#f5f1eb]"><span>Subtotal</span><span className="text-base leading-4">{formatEth(cart?.subtotalEth)} ETH</span></div>
          <div className="flex items-start justify-between text-[15px] leading-5 text-[#f5f1eb]"><span>Desconto do lançamento</span><span>(-) {formatEth(cart?.discountEth)}</span></div>
          <div className="flex flex-col items-end">
            <div className="flex w-full items-center justify-between text-[15px] leading-5 text-[#f5f1eb]"><span>Taxa de rede</span><span className="text-base leading-4">{cart?.networkFeeEth ?? '0'} ETH</span></div>
            <span className="text-xs leading-4 text-[#e89b55]">Taxa estimada</span>
          </div>
          <div className="flex items-start justify-between"><span className="text-base font-bold leading-4 text-[#f5f1eb]">Total</span><span className="text-[18px] font-bold leading-4 text-[#e89b55]">{cart?.totalEth ?? '0'} ETH</span></div>
          </>}
        </div>
        <button type="button" disabled={items.length === 0 || hasUnavailable} onClick={onCheckout} className="h-[60px] w-full cursor-pointer rounded-[40px] bg-[linear-gradient(93.21deg,#d28a4c_-3.96%,rgba(210,138,76,0.8)_121.97%)] text-base font-bold leading-4 text-[#140d0a] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:cursor-not-allowed disabled:opacity-50">{signedIn ? 'Finalizar' : 'Conectar e finalizar'}</button>
      </section>
    </main>
  )
}
