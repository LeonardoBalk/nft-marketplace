import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { OrderReceiptDialog } from './order-receipt-dialog'
import { SiteFooter } from './site-footer'
import type { WalletSlot } from '../features/account/contracts'
import { useProfile, useWallets } from '../features/account/queries'
import { useAuthModal } from '../features/auth/modal-context'
import { useAuthSession } from '../features/auth/queries'
import { checkoutSchema, ensSuffixes, walletNetworks, walletTypes, type CartSummary, type CheckoutRequest, type OrderReceipt } from '../features/cart/contracts'
import { cartQuery, useApplyCoupon, useCart, useCheckout } from '../features/cart/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'

const pageShell = 'mx-auto max-w-[1200px] px-5 sm:px-8 xl:px-0'
const networkLabels: Record<(typeof walletNetworks)[number], string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
const walletLabels: Record<(typeof walletTypes)[number], string> = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' }
const walletProviderOptions = [
  { value: 'supported', label: 'MetaMask · WalletConnect · Coinbase' },
  { value: 'metamask', label: 'MetaMask' },
  { value: 'coinbase', label: 'Coinbase Wallet' },
] as const

function formatEth(value: string | undefined) {
  return Number(value ?? 0).toFixed(2)
}

// assinatura da cotação: muda a cada alteração de preço, taxa, cupom ou item
function quoteOf(cart: CartSummary | undefined | null) {
  if (!cart) return null
  return [cart.itemCount, cart.subtotalEth, cart.discountEth, cart.networkFeeEth, cart.totalEth, cart.couponCode ?? ''].join('|')
}

function tokenId(nftId: string) {
  return `#${(nftId.match(/\d+$/)?.[0] ?? '0').padStart(4, '0')}`
}

function Field({ label, required = false, hideLabel = false, htmlFor, error, children }: { label: string; required?: boolean; hideLabel?: boolean; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <Label htmlFor={htmlFor} className={hideLabel ? 'sr-only' : 'h-[29px]'}>
        {label}
        {required && <span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span>}
      </Label>
      {hideLabel && <span aria-hidden="true" className="h-[29px]" />}
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-[#ffb59c]">{error}</p>}
    </div>
  )
}

function SelectField({ id, name, placeholder, defaultValue, options }: { id: string; name: string; placeholder: string; defaultValue?: string; options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  )
}

export function CheckoutPage() {
  const { cart, isPending } = useCart()
  const { data: user } = useAuthSession()
  const { openAuth } = useAuthModal()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkout = useCheckout()
  const coupon = useApplyCoupon()
  const wallets = useWallets(Boolean(user))
  const profile = useProfile(Boolean(user))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [couponOpen, setCouponOpen] = useState(false)
  const [walletProvider, setWalletProvider] = useState<string>('coinbase')
  const [walletSlot, setWalletSlot] = useState<WalletSlot>('primary')
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null)
  const [reviewedQuote, setReviewedQuote] = useState<string | null>(null)
  const idempotencyKey = useRef<string | null>(null)

  const savedWallet = (walletSlot === 'secondary' ? wallets.data?.secondary : wallets.data?.primary) ?? null
  const currentQuote = quoteOf(cart)
  const quoteChanged = reviewedQuote !== null && currentQuote !== null && currentQuote !== reviewedQuote

  useEffect(() => {
    // a primeira cotação vista vira a referência; mudança pede nova confirmação
    if (currentQuote !== null && reviewedQuote === null) setReviewedQuote(currentQuote)
  }, [currentQuote, reviewedQuote])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    const raw = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = checkoutSchema.safeParse({ ...raw, useOtherWallet: raw.useOtherWallet === 'on', walletProvider })
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        nextErrors[key] ??= issue.message
      }
      setErrors(nextErrors)
      return
    }

    if (!user) {
      openAuth('login', '/checkout')
      return
    }

    // revalidar a cotação antes de cobrar; se mudou, o aviso aparece e o envio para
    const fresh = await queryClient.fetchQuery({ ...cartQuery(), staleTime: 0 })
    if (quoteOf(fresh) !== reviewedQuote) return

    // a chave só troca após pedido concluído: resposta perdida recupera o mesmo pedido
    idempotencyKey.current ??= crypto.randomUUID()

    try {
      setReceipt(await checkout.mutateAsync({ input: parsed.data as CheckoutRequest, idempotencyKey: idempotencyKey.current }))
      idempotencyKey.current = null
    } catch (error) {
      // retomar checkout sem perder o carrinho
      if (isAxiosError(error) && error.response?.status === 401) openAuth('login', '/checkout')
    }
  }

  const applyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    // o cupom é mudança do próprio usuário: já entra revisada, sem pedir confirmação
    if (code) coupon.mutate(code, { onSuccess: (summary) => setReviewedQuote(quoteOf(summary)) })
  }

  const checkoutError = isAxiosError<{ message?: string }>(checkout.error) ? checkout.error.response?.data?.message ?? 'Não foi possível concluir a compra.' : null
  const couponError = isAxiosError<{ message?: string }>(coupon.error) ? coupon.error.response?.data?.message ?? 'Não foi possível aplicar o cupom.' : null
  const items = cart?.items ?? []

  return <>
    <main className={`${pageShell} pb-6 pt-8`}>
      <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
        <Link to="/" search={defaultCatalogSearch} className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Início</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Mercado</Link>
        <span aria-hidden="true" className="px-1 text-[#cfb28c]">/</span>
        <span aria-current="page" className="text-[#f5f1eb]">Pagamento</span>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_405px]">
        <section aria-labelledby="profile-title" className="flex flex-col gap-3">
          <h1 id="profile-title" className="text-[17px] font-bold leading-4">Perfil do colecionador</h1>

          {user && (wallets.data?.primary || wallets.data?.secondary) && <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-[#3f2319] bg-[#241612] px-4 py-3">
            <span id="saved-wallet-label" className="text-sm leading-5 text-[#cfb28c]">Preencher com uma carteira cadastrada:</span>
            <RadioGroup aria-labelledby="saved-wallet-label" value={walletSlot} onValueChange={(value) => setWalletSlot(value as WalletSlot)} className="flex-row gap-4">
              {(['primary', 'secondary'] as const).filter((slot) => wallets.data?.[slot]).map((slot) => <Label key={slot} htmlFor={`saved-${slot}`} className="cursor-pointer gap-2 text-sm leading-5">
                <RadioGroupItem id={`saved-${slot}`} value={slot} />
                {slot === 'primary' ? 'Principal' : 'Secundária'}
              </Label>)}
            </RadioGroup>
            <Link to="/carteiras" className="text-sm leading-5 text-[#e89b55] underline transition-colors hover:text-[#f5f1eb] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Gerenciar carteiras</Link>
          </div>}

          {/* a chave remonta o form quando a carteira chega, para os defaultValue valerem */}
          <form id="checkout-form" key={`${walletSlot}-${savedWallet?.address ?? ''}-${profile.data?.username ?? ''}`} noValidate onSubmit={(event) => void submit(event)} className="grid gap-6 sm:grid-cols-2">
            <Field label="Nome de exibição" required htmlFor="displayName" error={errors.displayName}>
              <Input id="displayName" name="displayName" autoComplete="name" maxLength={80} defaultValue={savedWallet?.displayName ?? profile.data?.displayName ?? ''} />
            </Field>
            <Field label="Nome de usuário" required htmlFor="username" error={errors.username}>
              <Input id="username" name="username" autoComplete="username" maxLength={80} defaultValue={profile.data?.username ?? ''} />
            </Field>
            <Field label="Rede" required htmlFor="network" error={errors.network}>
              <SelectField id="network" name="network" placeholder="Selecione uma rede" defaultValue={savedWallet?.network} options={walletNetworks.map((value) => ({ value, label: networkLabels[value] }))} />
            </Field>
            <Field label="Nome do perfil" required htmlFor="profileName" error={errors.profileName}>
              <Input id="profileName" name="profileName" maxLength={80} defaultValue={savedWallet?.profileName ?? ''} />
            </Field>
            <Field label="Endereço da carteira" required htmlFor="walletAddress" error={errors.walletAddress}>
              <Input id="walletAddress" name="walletAddress" placeholder="Endereço 0x da carteira" maxLength={42} defaultValue={savedWallet?.address ?? ''} aria-invalid={Boolean(errors.walletAddress)} />
            </Field>
            <Field label="Carteira secundária" hideLabel htmlFor="secondaryWallet" error={errors.secondaryWallet}>
              <Input id="secondaryWallet" name="secondaryWallet" placeholder="ENS ou carteira secundária (opcional)" maxLength={120} defaultValue={savedWallet?.secondaryAddress ?? ''} />
            </Field>
            <Field label="Tipo de carteira" required htmlFor="walletType" error={errors.walletType}>
              <SelectField id="walletType" name="walletType" placeholder="Selecione uma carteira" defaultValue={savedWallet?.type} options={walletTypes.map((value) => ({ value, label: walletLabels[value] }))} />
            </Field>
            <Field label="Código de indicação" required htmlFor="referralCode" error={errors.referralCode}>
              <Input id="referralCode" name="referralCode" maxLength={40} defaultValue={savedWallet?.referralCode ?? ''} />
            </Field>
            <Field label="E-mail" required htmlFor="email" error={errors.email}>
              <Input id="email" name="email" type="email" autoComplete="email" defaultValue={savedWallet?.email ?? profile.data?.email ?? ''} aria-invalid={Boolean(errors.email)} />
            </Field>
            <Field label="Nome ENS" required htmlFor="ensSuffix" error={errors.ensSuffix}>
              <div className="w-[92px]"><SelectField id="ensSuffix" name="ensSuffix" placeholder=".eth" defaultValue={savedWallet?.ensSuffix ?? profile.data?.ensSuffix ?? '.eth'} options={ensSuffixes.map((value) => ({ value, label: value }))} /></div>
            </Field>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id="useOtherWallet" name="useOtherWallet" />
              <Label htmlFor="useOtherWallet" className="cursor-pointer leading-5">Usar outra carteira?</Label>
            </div>
            <div className="flex flex-col gap-3 sm:col-span-2">
              <Label htmlFor="note">Observação do colecionador (opcional)</Label>
              <Textarea id="note" name="note" maxLength={500} rows={6} className="max-w-[350px]" />
            </div>
          </form>
        </section>

        <section aria-labelledby="order-title" className="flex flex-col gap-3">
          <h2 id="order-title" className="text-[17px] font-bold leading-4">Seus NFTs</h2>
          <div className="flex items-center justify-between text-base leading-4">
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Subtotal</span>
          </div>
          <Separator />

          {isPending
            ? <p className="text-sm text-[#cfb28c]" role="status">Carregando carrinho…</p>
            : items.length === 0
              ? <p className="text-sm leading-6 text-[#cfb28c]">Seu carrinho está vazio. <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-[#e89b55] underline">Explore o mercado</Link> para escolher uma peça.</p>
              : <ul className="flex flex-col gap-3">
                {items.map((line) => <li key={line.nft.id} className="flex items-center gap-2 bg-[#241612] py-1 pl-1 pr-3">
                  <img src={line.nft.artwork} alt="" loading="lazy" width="70" height="70" className="size-[70px] shrink-0 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                    <p className="truncate text-[15px] font-bold leading-4">{line.nft.name}</p>
                    <p className="text-sm leading-4 text-[#b39463]">ID do token: {tokenId(line.nft.id)}</p>
                  </div>
                  <span className="shrink-0 text-sm leading-4 text-[#cfb28c]">(x {line.quantity})</span>
                  <span className="shrink-0 whitespace-nowrap text-right text-[18px] font-bold leading-4 text-[#e89b55] tabular-nums">{line.lineTotalEth} ETH</span>
                </li>)}
              </ul>}

          <div className="flex flex-col items-center gap-3">
            {couponOpen
              ? <form onSubmit={applyCoupon} className="flex w-full gap-2">
                <label htmlFor="coupon" className="sr-only">Código promocional</label>
                <Input id="coupon" name="code" defaultValue="" maxLength={32} placeholder="KURIO10" className="flex-1" />
                <Button type="submit" disabled={coupon.isPending} className="h-10 min-h-0 rounded-[6px] px-4 text-sm font-bold">Aplicar</Button>
              </form>
              : <button type="button" onClick={() => setCouponOpen(true)} className="w-full cursor-pointer border-0 bg-transparent text-center text-sm leading-4 text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Tem um código promocional? Aplique aqui</button>}
            {couponError && <p role="alert" className="text-xs text-[#ffb59c]">{couponError}</p>}
            {cart?.couponCode && <p role="status" className="text-xs text-[#e89b55]">Cupom {cart.couponCode} aplicado.</p>}

            <div className="flex w-full items-center justify-between text-[15px] leading-5">
              <span>Subtotal</span>
              <span className="text-[18px] leading-4">{formatEth(cart?.subtotalEth)} ETH</span>
            </div>
            <div className="flex w-full items-center justify-between text-[15px] leading-5">
              <span>Desconto do lançamento</span>
              <span>(-) {formatEth(cart?.discountEth)}</span>
            </div>
            <div className="flex w-full items-center justify-between text-[15px] leading-5">
              <span>Taxa de rede</span>
              <span className="text-[18px] leading-4">{cart?.networkFeeEth ?? '0'} ETH</span>
            </div>
            <p className="w-full text-center text-xs leading-4 text-[#e89b55]">Taxa estimada</p>
            <Separator />
            <div className="flex w-full max-w-[321px] items-center justify-between">
              <span className="text-base font-bold leading-4">Total</span>
              <span className="text-[18px] font-bold leading-4 text-[#e89b55]">{cart?.totalEth ?? '0'} ETH</span>
            </div>
          </div>

          <h3 className="mt-5 text-center text-[17px] font-bold leading-4">Carteira e rede</h3>
          <RadioGroup aria-label="Carteira e rede" value={walletProvider} onValueChange={setWalletProvider} className="gap-4">
            {walletProviderOptions.map((option, index) => <Label key={option.value} htmlFor={`wallet-${option.value}`} className={`h-[45px] cursor-pointer gap-[10px] rounded-[3px] border px-3 leading-5 transition-colors ${walletProvider === option.value ? 'border-[#d28a4c]' : 'border-[#3f2319]'}`}>
              <RadioGroupItem id={`wallet-${option.value}`} value={option.value} />
              {index === 0
                ? <span className="flex h-[26px] items-center rounded-md border border-[#55321f] bg-[#38220f] px-2 text-[9px] font-bold leading-3 tracking-[0.1px] text-[#e89b55]">METAMASK · WALLETCONNECT · COINBASE</span>
                : option.label}
            </Label>)}
          </RadioGroup>
          {errors.walletProvider && <p role="alert" className="text-xs text-[#ffb59c]">{errors.walletProvider}</p>}

          {quoteChanged && <div role="alert" className="flex flex-col gap-3 rounded-[3px] border border-[#f0805f] bg-[#2f1d15] px-4 py-3">
            <p className="text-sm leading-5 text-[#ffb59c]">Os valores mudaram enquanto você preenchia. O novo total é {cart?.totalEth ?? '0'} ETH.</p>
            <Button type="button" variant="outline" onClick={() => setReviewedQuote(currentQuote)} className="h-9 min-h-0 w-fit rounded-[6px] border-[#d28a4c] px-4 text-sm font-bold text-[#e89b55]">Revisar e continuar</Button>
          </div>}

          <Button type="submit" form="checkout-form" disabled={checkout.isPending || items.length === 0 || quoteChanged} className="mt-1 h-[45px] w-full min-h-0 rounded-[6px] text-base font-bold">{checkout.isPending ? 'Confirmando…' : 'Confirmar compra'}</Button>
          {checkoutError && <p role="alert" className="text-xs text-[#ffb59c]">{checkoutError}</p>}
          {!user && <p className="text-xs leading-5 text-[#cfb28c]">Você entra na conta ao confirmar; o carrinho continua o mesmo depois disso.</p>}
          <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-center text-[15px] leading-5 text-[#e89b55] transition-colors hover:text-[#f5f1eb] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Continuar explorando</Link>
        </section>
      </div>
    </main>
    <SiteFooter />
    {receipt && <OrderReceiptDialog receipt={receipt} onClose={() => { setReceipt(null); void navigate({ to: '/', search: defaultCatalogSearch, hash: 'catalogo' }) }} />}
  </>
}
