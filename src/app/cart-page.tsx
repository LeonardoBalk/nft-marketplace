import { Link, useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SiteFooter } from './site-footer'
import { useAuthModal } from '../features/auth/modal-context'
import { useAuthSession } from '../features/auth/queries'
import { useApplyCoupon, useCart, useRemoveCartItem, useUpdateCartItem } from '../features/cart/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { RelatedCarousel } from '../features/catalog/related-carousel'

const pageShell = 'mx-auto max-w-[1200px] px-5 sm:px-8 xl:px-0'
const stepperButton = 'flex size-6 cursor-pointer items-center justify-center rounded-full border border-[#140d0a] bg-[#d28a4c] text-black transition-colors hover:bg-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50'

function tokenId(nftId: string) {
  return `#${(nftId.match(/\d+$/)?.[0] ?? '0').padStart(4, '0')}`
}

function formatEth(value: string | undefined) {
  return Number(value ?? 0).toFixed(2)
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

  // autenticar antes de continuar para o checkout
  const connectAndCheckout = () => {
    if (user) void navigate({ to: '/checkout' })
    else openAuth('login', '/checkout')
  }

  const items = cart?.items ?? []
  const firstNftId = items[0]?.nft.id ?? ''

  const applyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = couponCode.trim()
    if (code) coupon.mutate(code)
  }

  return <>
    <main className={`${pageShell} pb-6 pt-8`}>
      <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
        <Link to="/" search={defaultCatalogSearch} className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Início</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Mercado</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <span aria-current="page">Carrinho</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="cart-title" className="flex flex-col gap-3">
          <h1 id="cart-title" className="sr-only">Carrinho de NFTs</h1>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-4 text-base leading-4 sm:grid-cols-[minmax(0,1fr)_96px_104px_104px_40px]">
            <span className="font-bold">NFTs</span>
            <span className="hidden font-medium sm:block">Preço</span>
            <span className="hidden font-medium sm:block">Edições</span>
            <span className="font-medium">Total</span>
            <span className="sr-only">Remover</span>
          </div>
          <Separator />

          {isError
            ? <p role="alert" className="text-sm text-[#ffb59c]">Não foi possível carregar seu carrinho. Atualize a página para tentar de novo.</p>
            : isPending
              ? <ul className="flex flex-col gap-3" role="status" aria-label="Carregando carrinho">{Array.from({ length: 3 }, (_, index) => <CartRowSkeleton key={index} />)}</ul>
              : items.length === 0
                ? <p className="text-[15px] leading-6 text-[#cfb28c]">Seu carrinho está vazio. <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-[#e89b55] underline">Explore o mercado</Link> para escolher uma peça.</p>
                : <ul className="flex flex-col gap-3">
                  {items.map((line) => <li key={line.nft.id} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-4 bg-[#241612] p-2 sm:grid-cols-[minmax(0,1fr)_96px_104px_104px_40px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={line.nft.artwork} alt="" loading="lazy" width="70" height="70" className="size-[70px] shrink-0 rounded-lg object-cover" />
                      <div className="flex min-w-0 flex-col gap-[6px]">
                        <Link to="/nft/$nftId" params={{ nftId: line.nft.id }} className="truncate text-base font-bold leading-4 transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">{line.nft.name}</Link>
                        <p className="text-sm leading-4 text-[#b39463]">ID do token: {tokenId(line.nft.id)}</p>
                      </div>
                    </div>
                    <span className="hidden text-[15px] leading-5 sm:block">{line.nft.priceEth} ETH</span>
                    <div className="hidden items-center gap-2 sm:flex">
                      <button type="button" aria-label={`Diminuir quantidade de ${line.nft.name}`} disabled={updateItem.isPending || line.quantity <= 1} onClick={() => updateItem.mutate({ nftId: line.nft.id, quantity: line.quantity - 1 })} className={stepperButton}><Minus size={14} strokeWidth={2.5} /></button>
                      <output aria-label={`Quantidade de ${line.nft.name}`} className="min-w-[13px] text-center text-[15px] leading-5">{line.quantity}</output>
                      <button type="button" aria-label={`Aumentar quantidade de ${line.nft.name}`} disabled={updateItem.isPending || line.quantity >= line.nft.available} onClick={() => updateItem.mutate({ nftId: line.nft.id, quantity: line.quantity + 1 })} className={stepperButton}><Plus size={14} strokeWidth={2.5} /></button>
                    </div>
                    <span className="text-[18px] font-bold leading-4 text-[#e89b55] tabular-nums">{line.lineTotalEth} ETH</span>
                    <button type="button" aria-label={`Remover ${line.nft.name} do carrinho`} disabled={removeItem.isPending} onClick={() => removeItem.mutate(line.nft.id)} className="flex size-10 cursor-pointer items-center justify-center text-[#cfb28c] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:pointer-events-none disabled:opacity-50"><Trash2 size={18} strokeWidth={1.6} /></button>
                  </li>)}
                </ul>}

          {updateItem.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(updateItem.error, 'Não foi possível alterar a quantidade.')}</p>}
          {removeItem.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(removeItem.error, 'Não foi possível remover o item.')}</p>}
        </section>

        <section aria-labelledby="summary-title" className="flex flex-col gap-3">
          <h2 id="summary-title" className="text-[17px] font-bold leading-4">Resumo da carteira</h2>
          <Separator />

          <form onSubmit={applyCoupon} className="flex flex-col gap-2">
            <label htmlFor="cart-coupon" className="text-[15px] font-bold leading-4">Código promocional</label>
            <div className="flex">
              <Input id="cart-coupon" name="code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} maxLength={32} placeholder="Digite o código promocional..." className="min-w-0 flex-1 rounded-r-none" />
              <Button type="submit" disabled={coupon.isPending || !couponCode.trim()} className="h-10 min-h-0 shrink-0 rounded-l-none rounded-r-[3px] px-5 text-base font-medium">{coupon.isPending ? 'Aplicando…' : 'Aplicar'}</Button>
            </div>
            {coupon.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(coupon.error, 'Não foi possível aplicar o cupom.')}</p>}
            {cart?.couponCode && <p role="status" className="text-xs text-[#e89b55]">Cupom {cart.couponCode} aplicado.</p>}
          </form>

          <div className="mt-2 flex flex-col gap-3">
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
            <div className="flex items-center justify-between">
              <span className="text-base font-bold leading-4">Total</span>
              <span className="text-[18px] font-bold leading-4 text-[#e89b55]">{cart?.totalEth ?? '0'} ETH</span>
            </div>
          </div>

          <Button type="button" disabled={items.length === 0} onClick={connectAndCheckout} className="mt-2 h-[45px] w-full min-h-0 rounded-[6px] text-base font-bold">Conectar e finalizar</Button>
          <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-center text-[15px] leading-5 text-[#e89b55] transition-colors hover:text-[#f5f1eb] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Continuar explorando</Link>
        </section>
      </div>
    </main>

    {firstNftId && <RelatedCarousel nftId={firstNftId} title="Colecionadores também viram" className={`${pageShell} mt-24`} />}
    <SiteFooter />
  </>
}
