import { formatEth } from '../shared/money/eth'
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
import { MobileCheckout } from './mobile-checkout'
import { SiteFooter } from './site-footer'
import type { WalletSlot } from '../features/account/contracts'
import { useProfile, useWallets } from '../features/account/queries'
import { useAuthModal } from '../features/auth/modal-context'
import { useAuthSession } from '../features/auth/queries'
import { cartQuoteFingerprint, checkoutSchema, ensSuffixes, walletNetworks, walletTypes, type CartSummary, type CheckoutRequest } from '../features/cart/contracts'
import { cartQuery, useApplyCoupon, useCart, useCheckout, useConnectWallet } from '../features/cart/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { useMediaQuery } from '../shared/ui/use-media-query'

const pageShell = 'mx-auto max-w-[1200px] px-5 sm:px-8 xl:px-0'
const networkLabels: Record<(typeof walletNetworks)[number], string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
const walletLabels: Record<(typeof walletTypes)[number], string> = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' }
const walletProviderOptions = [
  { value: 'supported', label: 'MetaMask · WalletConnect · Coinbase' },
  { value: 'metamask', label: 'MetaMask' },
  { value: 'coinbase', label: 'Coinbase Wallet' },
] as const

// assinatura da cotação: também cobre disponibilidade e versão de cada NFT
function quoteOf(cart: CartSummary | undefined | null) {
  return cart ? cartQuoteFingerprint(cart) : null
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
  const connectWallet = useConnectWallet()
  const coupon = useApplyCoupon()
  const wallets = useWallets(Boolean(user))
  const profile = useProfile(Boolean(user))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [couponOpen, setCouponOpen] = useState(false)
  const [walletProvider, setWalletProvider] = useState<string>('coinbase')
  const [walletSlot, setWalletSlot] = useState<WalletSlot>('primary')
  const [reviewedQuote, setReviewedQuote] = useState<string | null>(null)
  const idempotencyKey = useRef<string | null>(typeof window === 'undefined' ? null : sessionStorage.getItem('kurio.checkout.idempotency.v1'))
  const [savedWalletError, setSavedWalletError] = useState<string | null>(null)
  const [preflightError, setPreflightError] = useState<string | null>(null)
  const [preflightPending, setPreflightPending] = useState(false)
  const confirmingRef = useRef(false)
  const [connectedWallet, setConnectedWallet] = useState<{ provider: string; connectionId: string } | null>(null)
  const [walletConnectionError, setWalletConnectionError] = useState<string | null>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const savedWallet = (walletSlot === 'secondary' ? wallets.data?.secondary ?? wallets.data?.primary : wallets.data?.primary ?? wallets.data?.secondary) ?? null
  const currentQuote = quoteOf(cart)
  const quoteChanged = reviewedQuote !== null && currentQuote !== null && currentQuote !== reviewedQuote

  useEffect(() => {
    // a primeira cotação vista vira a referência; mudança pede nova confirmação
    if (currentQuote !== null && reviewedQuote === null) setReviewedQuote(currentQuote)
  }, [currentQuote, reviewedQuote])

  // o form do desktop e as carteiras do mobile chegam aqui com o pedido já validado
  const confirmPurchase = async (input: CheckoutRequest) => {
    if (!user) {
      openAuth('login', '/checkout')
      return
    }

    if (confirmingRef.current) return
    confirmingRef.current = true
    try {
    setPreflightError(null)
    setWalletConnectionError(null)
    setPreflightPending(true)
    let connectionId = connectedWallet?.provider === walletProvider ? connectedWallet.connectionId : null
    if (!connectionId) {
      try {
        const connection = await connectWallet.mutateAsync(walletProvider)
        connectionId = connection.connectionId
        setConnectedWallet({ provider: walletProvider, connectionId })
      } catch (error) {
        setWalletConnectionError(isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? 'Não foi possível conectar a carteira.' : 'Não foi possível conectar a carteira.')
        setPreflightPending(false)
        return
      }
    }

    // revalidar a cotação antes de cobrar; se mudou, o aviso aparece e o envio para
    let fresh: CartSummary
    try {
      fresh = await queryClient.fetchQuery({ ...cartQuery(), staleTime: 0 })
    } catch {
      setPreflightError('Não foi possível atualizar os valores. Tente novamente antes de pagar.')
      setPreflightPending(false)
      return
    }
    setPreflightPending(false)
    const expectedQuote = reviewedQuote
    if (!expectedQuote || quoteOf(fresh) !== expectedQuote) return
    if (!connectionId) return

    // a chave só troca após pedido concluído: resposta perdida recupera o mesmo pedido
    idempotencyKey.current ??= crypto.randomUUID()
    sessionStorage.setItem('kurio.checkout.idempotency.v1', idempotencyKey.current)

    try {
      const order = await checkout.mutateAsync({ input, idempotencyKey: idempotencyKey.current, expectedQuote, connectionId })
      idempotencyKey.current = null
      sessionStorage.removeItem('kurio.checkout.idempotency.v1')
      // replace: voltar depois da compra não pode cair num pagamento com o carrinho já vazio
      void navigate({ to: '/pedido/$orderId', params: { orderId: order.orderId }, replace: true })
    } catch (error) {
      // retomar checkout sem perder o carrinho
      if (isAxiosError(error) && error.response?.status === 401) openAuth('login', '/checkout')
      if (isAxiosError(error) && error.response?.data?.code === 'WALLET_DISCONNECTED') {
        setConnectedWallet(null)
        setWalletConnectionError(error.response.data.message ?? 'A conexão com a carteira foi interrompida. Conecte novamente para continuar.')
      }
      if (isAxiosError(error) && error.response?.status === 409 && error.response.data?.code === 'QUOTE_CHANGED') {
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
      }
    }
    } finally {
      confirmingRef.current = false
    }
  }

  // no mobile não há form: o pedido sai da carteira escolhida e do perfil
  const confirmWithSavedWallet = () => {
    setSavedWalletError(null)
    if (!savedWallet) return
    const parsed = checkoutSchema.safeParse({
      displayName: savedWallet.displayName,
      username: profile.data?.username ?? '',
      network: savedWallet.network,
      profileName: savedWallet.profileName,
      walletAddress: savedWallet.address,
      secondaryWallet: savedWallet.secondaryAddress,
      walletType: savedWallet.type,
      referralCode: savedWallet.referralCode,
      email: savedWallet.email,
      ensSuffix: savedWallet.ensSuffix,
      useOtherWallet: false,
      note: '',
      walletProvider,
    })
    if (!parsed.success) {
      setSavedWalletError('Complete os dados desta carteira em Carteiras para pagar com ela.')
      return
    }
    void confirmPurchase(parsed.data as CheckoutRequest)
  }

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

    await confirmPurchase(parsed.data as CheckoutRequest)
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

  // o frame mobile troca o form pelas carteiras salvas; a confirmação é a mesma
  if (!isDesktop) return <>
    <MobileCheckout
      signedIn={Boolean(user)}
      wallets={wallets.data}
      walletsPending={Boolean(user) && wallets.isPending}
      selectedSlot={savedWallet?.slot ?? walletSlot}
      onSelectSlot={(slot) => { setSavedWalletError(null); setWalletSlot(slot) }}
      provider={walletProvider}
      onSelectProvider={(provider) => { setWalletProvider(provider); setConnectedWallet(null); setWalletConnectionError(null) }}
      totalEth={cart?.totalEth}
      quoteChanged={quoteChanged}
      onReviewQuote={() => setReviewedQuote(currentQuote)}
      canConfirm={items.length > 0 && Boolean(savedWallet) && !checkout.isPending && !preflightPending && !quoteChanged}
      confirming={checkout.isPending || preflightPending}
      error={savedWalletError ?? walletConnectionError ?? checkoutError ?? preflightError}
      onConfirm={confirmWithSavedWallet}
      onSignIn={() => openAuth('login', '/checkout')}
    />
  </>

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
              <Textarea id="note" name="note" maxLength={500} rows={6} className="max-h-60 max-w-[350px] resize-y overflow-y-auto" />
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
                {items.map((line) => <li key={`${line.nft.id}:${line.edition}`} className="flex items-center gap-2 bg-[#241612] py-1 pl-1 pr-3">
                  <img src={line.nft.artwork} alt="" loading="lazy" width="70" height="70" className="size-[70px] shrink-0 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                    <p className="truncate text-[15px] font-bold leading-4">{line.nft.name}</p>
                    <p className="text-sm leading-4 text-[#b39463]">ID do token: {tokenId(line.nft.id)} · Edição: {line.edition}</p>
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
          <RadioGroup aria-label="Carteira e rede" value={walletProvider} onValueChange={(provider) => { setWalletProvider(provider); setConnectedWallet(null); setWalletConnectionError(null) }} className="gap-4">
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

          <Button type="submit" form="checkout-form" disabled={checkout.isPending || preflightPending || items.length === 0 || quoteChanged} className="mt-1 h-[45px] w-full min-h-0 rounded-[6px] text-base font-bold">{preflightPending ? 'Atualizando valores…' : checkout.isPending ? 'Confirmando…' : 'Confirmar compra'}</Button>
          {(walletConnectionError ?? checkoutError ?? preflightError) && <p role="alert" className="text-xs text-[#ffb59c]">{walletConnectionError ?? checkoutError ?? preflightError}</p>}
          {!user && <p className="text-xs leading-5 text-[#cfb28c]">Você entra na conta ao confirmar; o carrinho continua o mesmo depois disso.</p>}
          <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="text-center text-[15px] leading-5 text-[#e89b55] transition-colors hover:text-[#f5f1eb] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Continuar explorando</Link>
        </section>
      </div>
    </main>
    <SiteFooter />
  </>
}
