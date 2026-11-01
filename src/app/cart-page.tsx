import { formatEth } from '../shared/money/eth'
import { Link, useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SiteFooter } from './site-footer'
import { useAuthModal } from '../features/auth/modal-context'
import { useAuthSession } from '../features/auth/queries'
import { useApplyCoupon, useCart, useRemoveCartItem, useUpdateCartItem } from '../features/cart/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { RelatedCarousel } from '../features/catalog/related-carousel'
import { useMediaQuery } from '../shared/ui/use-media-query'
import { MobileCart } from './mobile-cart'

const pageShell = 'mx-auto max-w-[1200px] px-5 sm:px-8 xl:px-0'
// colunas do frame (nft, preço, edições, total, remover) distribuídas como o auto layout, com 24px à direita
const cartColumns = 'grid grid-cols-[250px_77px_75px_87px_24px] items-center justify-between pr-6'
// o fio do frame tem 0.3px: 1px a 30% dá o mesmo peso em qualquer densidade de tela
const hairline = <span aria-hidden="true" className="h-px w-full bg-[#d28a4c]/30" />
const stepperButton = 'flex h-[30px] w-5 shadow-[0_4px_12px_-2px_rgba(20,13,10,0.15)] cursor-pointer items-center justify-center rounded-full border border-[#140d0a] bg-[#d28a4c] text-black transition-colors hover:bg-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50'

function tokenId(nftId: string) {
  return `#${(nftId.match(/\d+$/)?.[0] ?? '0').padStart(4, '0')}`
}

function requestError(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback
}

function CartRowSkeleton() {
  return (
    <li className="flex items-center gap-4 bg-[#241612] p-3" aria-hidden="true">
      <Skeleton className="size-[70px] shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div>
      <Skeleton className="h-4 w-20" />
    </li>
  )
}

export function CartPage() {
  const { cart, isPending, isError } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const coupon = useApplyCoupon()
  const navigate = useNavigate()
  const { data: user } = useAuthSession()
  const { openAuth } = useAuthModal()
  const [couponCode, setCouponCode] = useState('')
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // autenticar antes de continuar para o checkout
  const connectAndCheckout = () => {
    if (user) void navigate({ to: '/checkout' })
    else openAuth('login', '/checkout')
  }

  const items = cart?.items ?? []
  const hasUnavailable = items.some((line) => line.quantity > line.nft.editionAvailability[line.edition] || items.filter((other) => other.nft.id === line.nft.id).reduce((sum, other) => sum + other.quantity, 0) > line.nft.available)
  const firstNftId = items[0]?.nft.id ?? ''

  const applyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = couponCode.trim()
    if (code) coupon.mutate(code)
  }

  // o frame mobile é outra estrutura (cards e folha de resumo), não a tabela espremida
  if (!isDesktop) return <MobileCart cart={cart} items={items} isPending={isPending} isError={isError} hasUnavailable={hasUnavailable} signedIn={Boolean(user)} updateItem={updateItem} removeItem={removeItem} coupon={coupon} couponCode={couponCode} onCouponCodeChange={setCouponCode} onApplyCoupon={applyCoupon} onCheckout={connectAndCheckout} errorOf={requestError} />

  return <>
    <main className={`${pageShell} pb-6 pt-8`}>
      <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
        <Link to="/" search={defaultCatalogSearch} className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Início</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Mercado</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <span aria-current="page">Carrinho</span>
      </nav>

      <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between">
        <section aria-labelledby="cart-title" className="flex flex-col gap-3">
          <h1 id="cart-title" className="sr-only">Carrinho de NFTs</h1>
          <div className={`${cartColumns} text-base leading-4 text-[#f5f1eb]`}>
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Preço</span>
            <span className="font-bold">Edições</span>
            <span className="font-medium">Total</span>
            <span className="sr-only">Remover</span>
          </div>
          {hairline}

          {isError
            ? <p role="alert" className="text-sm text-[#ffb59c]">Não foi possível carregar seu carrinho. Atualize a página para tentar de novo.</p>
            : isPending
              ? <ul className="flex flex-col gap-3" role="status" aria-label="Carregando carrinho">{Array.from({ length: 3 }, (_, index) => <CartRowSkeleton key={index} />)}</ul>
              : items.length === 0
                ? <p className="text-[15px] leading-6 text-[#cfb28c]">Seu carrinho está vazio. <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-[#e89b55] underline">Explore o mercado</Link> para escolher uma peça.</p>
                : <ul className="flex flex-col gap-3">
                  {items.map((line) => <li key={`${line.nft.id}:${line.edition}`} className={`${cartColumns} h-[70px] bg-[#241612]`}>
                    <div className="flex min-w-0 items-center gap-4">
                      <img src={line.nft.artwork} alt="" loading="lazy" width="70" height="70" className="size-[70px] shrink-0 rounded-[6px] object-cover" />
                      <div className="flex min-w-0 flex-col gap-[6px]">
                        <Link to="/nft/$nftId" params={{ nftId: line.nft.id }} className="truncate text-base font-bold leading-4 transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">{line.nft.name}</Link>
                        <p className="text-sm leading-4 text-[#b39463]">ID do token: {tokenId(line.nft.id)} · Edição: {line.edition}</p>
                      </div>
                    </div>
                    <span className="text-base font-bold leading-4 text-[#cfb28c] tabular-nums">{line.nft.priceEth} ETH</span>
                    <div className="flex items-center justify-center gap-3">
                      <button type="button" aria-label={`Diminuir quantidade de ${line.nft.name}, ${line.edition}`} disabled={updateItem.isPending || line.quantity <= 1} onClick={() => updateItem.mutate({ nftId: line.nft.id, edition: line.edition, quantity: line.quantity - 1 })} className={stepperButton}><Minus size={14} strokeWidth={2.5} /></button>
                      <output aria-label={`Quantidade de ${line.nft.name}, ${line.edition}`} className="min-w-[11px] text-center text-[17px] leading-6">{line.quantity}</output>
                      <button type="button" aria-label={`Aumentar quantidade de ${line.nft.name}, ${line.edition}`} disabled={updateItem.isPending || line.quantity >= line.nft.editionAvailability[line.edition] || items.filter((other) => other.nft.id === line.nft.id).reduce((sum, other) => sum + other.quantity, 0) >= line.nft.available} onClick={() => updateItem.mutate({ nftId: line.nft.id, edition: line.edition, quantity: line.quantity + 1 })} className={stepperButton}><Plus size={14} strokeWidth={2.5} /></button>
                    </div>
                    <span className="text-base font-bold leading-4 text-[#e89b55] tabular-nums">{line.lineTotalEth} ETH</span>
                    <button type="button" aria-label={`Remover ${line.nft.name} do carrinho, ${line.edition}`} disabled={removeItem.isPending} onClick={() => removeItem.mutate({ nftId: line.nft.id, edition: line.edition })} className="flex size-6 cursor-pointer items-center justify-center text-[#cfb28c] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:pointer-events-none disabled:opacity-50"><Trash2 size={18} strokeWidth={1.6} /></button>
                  </li>)}
                </ul>}

          {hasUnavailable && <p role="alert" className="text-xs text-[#ffb59c]">A disponibilidade mudou. Ajuste ou remova os itens indisponíveis antes de finalizar.</p>}
          {updateItem.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(updateItem.error, 'Não foi possível alterar a quantidade.')}</p>}
          {removeItem.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(removeItem.error, 'Não foi possível remover o item.')}</p>}
        </section>

        <section aria-labelledby="summary-title" className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 id="summary-title" className="text-[18px] font-bold leading-4">Resumo da carteira</h2>
            {hairline}
          </div>

          <form onSubmit={applyCoupon} className="flex flex-col gap-2">
            <label htmlFor="cart-coupon" className="text-sm font-bold leading-4">Código promocional</label>
            {/* campo e botão formam uma peça só, com a borda laranja do frame */}
            <div className="flex h-10 items-center rounded-[3px] border border-[#d28a4c] pl-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d99558]">
              <input id="cart-coupon" name="code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} maxLength={32} placeholder="Digite o código promocional..." autoComplete="off" className="min-w-0 flex-1 bg-transparent text-xs leading-4 text-[#f5f1eb] outline-none placeholder:text-[#b39463]" />
              <button type="submit" disabled={coupon.isPending} className="-my-px -mr-px h-10 w-[102px] shrink-0 cursor-pointer rounded-r-[3px] bg-[#d28a4c] text-[15px] font-bold leading-4 text-[#140d0a] transition-colors hover:bg-[#e89b55] disabled:cursor-not-allowed disabled:opacity-60">{coupon.isPending ? 'Aplicando…' : 'Aplicar'}</button>
            </div>
            {coupon.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(coupon.error, 'Não foi possível aplicar o cupom.')}</p>}
            {cart?.couponCode && <p role="status" className="text-xs text-[#e89b55]">Cupom {cart.couponCode} aplicado.</p>}
          </form>

          {isPending ? <div role="status" aria-label="Carregando resumo da carteira" className="flex flex-col gap-4">
            <Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-5 w-full" /><Skeleton className="h-8 w-full" />
          </div> : <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[15px] leading-5">
              <span>Subtotal</span>
              <span className="text-[18px] leading-4">{formatEth(cart?.subtotalEth)} ETH</span>
            </div>
            <div className="flex items-center justify-between text-[15px] leading-5">
              <span>Desconto do lançamento</span>
              <span>(-) {formatEth(cart?.discountEth)}</span>
            </div>
            <div className="flex items-center justify-between text-[15px] leading-5">
              <span>Taxa de rede</span>
              <span className="text-[18px] leading-4">{cart?.networkFeeEth ?? '0'} ETH</span>
            </div>
            <p className="text-right text-xs leading-4 text-[#e89b55]">Taxa estimada</p>
          </div>}
          {!isPending && <div className="flex items-center justify-between">
            <span className="text-base font-bold leading-4">Total</span>
            <span className="text-[18px] font-bold leading-4 text-[#e89b55]">{cart?.totalEth ?? '0'} ETH</span>
          </div>}

          <div className="flex flex-col items-center gap-3">
            <Button type="button" disabled={items.length === 0 || hasUnavailable} onClick={connectAndCheckout} className="h-10 w-full min-h-0 rounded-[3px] text-[15px] font-bold leading-4">{user ? 'Finalizar' : 'Conectar e finalizar'}</Button>
          <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-center text-[15px] leading-5 text-[#e89b55] transition-colors hover:text-[#f5f1eb] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Continuar explorando</Link>
          </div>
        </section>
      </div>
    </main>

    {firstNftId && <RelatedCarousel nftId={firstNftId} title="Colecionadores também viram" className={`${pageShell} mt-24`} />}
    <SiteFooter />
  </>
}
