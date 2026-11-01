import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, EllipsisVertical, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import type { CollectorWallet, WalletSlot, WalletsResponse } from '../features/account/contracts'

const networkLines: Record<CollectorWallet['network'], string> = { ethereum: 'Rede principal Ethereum', polygon: 'Rede Polygon', solana: 'Rede Solana' }

const providers: Array<{ value: string; label: string; mark: ReactNode }> = [
  { value: 'walletconnect', label: 'WalletConnect', mark: 'W' },
  { value: 'metamask', label: 'MetaMask', mark: 'M' },
  { value: 'coinbase', label: 'Coinbase Wallet', mark: <Wallet size={22} strokeWidth={1.5} className="text-[#d28a4c]" aria-hidden="true" /> },
]

// o cartão mostra o ens quando existe; sem ele, o endereço encurtado como no frame (0xA91F…E82C)
function walletLine(wallet: CollectorWallet) {
  return wallet.ensName ? `${wallet.ensName}${wallet.ensSuffix}` : `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
}

// radio do frame: aro de 1.2px e miolo de 8px quando marcado
function RadioMark({ checked }: { checked: boolean }) {
  return <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-full border-[1.2px] ${checked ? 'border-[#d28a4c]' : 'border-[#55321f]'}`}>{checked && <span className="size-2 rounded-full bg-[#d28a4c]" />}</span>
}

const focusRing = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#d99558]'

export function MobileCheckout({ signedIn, wallets, walletsPending, selectedSlot, onSelectSlot, provider, onSelectProvider, totalEth, quoteChanged, onReviewQuote, canConfirm, confirming, error, onConfirm, onSignIn }: {
  signedIn: boolean
  wallets?: WalletsResponse
  walletsPending: boolean
  selectedSlot: WalletSlot
  onSelectSlot: (slot: WalletSlot) => void
  provider: string
  onSelectProvider: (provider: string) => void
  totalEth?: string
  quoteChanged: boolean
  onReviewQuote: () => void
  canConfirm: boolean
  confirming: boolean
  error: string | null
  onConfirm: () => void
  onSignIn: () => void
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  const savedWallets = [wallets?.primary, wallets?.secondary].filter((wallet): wallet is CollectorWallet => Boolean(wallet))

  const goBack = () => {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/carrinho' })
  }

  return (
    <main className="flex min-h-dvh flex-col justify-between gap-4 px-7 py-8">
      <div className="flex flex-col gap-4">
        <div className="flex h-[44px] items-start gap-6">
          <button type="button" onClick={goBack} aria-label="Voltar" className="inline-flex size-[35px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#b39463] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]"><ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" /></button>
          <h1 className="mt-[9px] text-xl font-bold leading-4 text-[#f5f1eb]">Pagamento com carteira</h1>
        </div>

        <section aria-labelledby="connected-wallet-title" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 id="connected-wallet-title" className="text-base font-bold leading-4 text-[#f5f1eb]">Carteira conectada</h2>
            {signedIn && <Link to="/carteiras" className="text-sm font-bold leading-4 text-[#e89b55] transition-colors hover:text-[#f5b477] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]">Trocar carteira</Link>}
          </div>

          {!signedIn
            ? <div className="flex flex-col items-start gap-3 rounded-[14px] bg-[#241612] p-5">
              <p className="text-sm leading-[22px] text-[#cfb28c]">Entre na sua conta para pagar com uma carteira cadastrada. O carrinho continua o mesmo.</p>
              <button type="button" onClick={onSignIn} className="h-10 cursor-pointer rounded-[40px] border border-[#d28a4c] px-5 text-sm font-bold text-[#e89b55] transition-colors hover:bg-[#d28a4c]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]">Entrar</button>
            </div>
            : walletsPending
              ? <div className="flex flex-col gap-5" role="status" aria-label="Carregando carteiras"><Skeleton className="h-[93px] rounded-[14px]" /><Skeleton className="h-[93px] rounded-[14px]" /></div>
              : savedWallets.length === 0
                ? <div className="flex flex-col items-start gap-3 rounded-[14px] bg-[#241612] p-5">
                  <p className="text-sm leading-[22px] text-[#cfb28c]">Nenhuma carteira cadastrada ainda.</p>
                  <Link to="/carteiras" className="text-sm font-bold text-[#e89b55] underline focus-visible:outline-2 focus-visible:outline-[#d99558]">Cadastrar carteira</Link>
                </div>
                : <div role="radiogroup" aria-labelledby="connected-wallet-title" className="flex flex-col gap-5">
                  {savedWallets.map((wallet) => {
                    const checked = wallet.slot === selectedSlot
                    return <div key={wallet.slot} className="relative">
                      <label className={`flex h-[93px] cursor-pointer items-start gap-[19px] rounded-[14px] bg-[#241612] pl-[19px] pr-12 pt-[15px] transition-shadow ${checked ? 'shadow-[0_20px_20px_rgba(10,6,4,0.45)]' : ''} ${focusRing}`}>
                        <input type="radio" name="saved-wallet" value={wallet.slot} checked={checked} onChange={() => onSelectSlot(wallet.slot)} className="sr-only" />
                        <span className="mt-6"><RadioMark checked={checked} /></span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-bold leading-4 text-[#f5f1eb]">{wallet.nickname}</span>
                          <span className="mt-[7px] truncate text-sm leading-[22px] text-[#cfb28c]">{walletLine(wallet)}</span>
                          <span className="truncate text-sm leading-[22px] text-[#cfb28c]">{networkLines[wallet.network]}</span>
                        </span>
                      </label>
                      {/* fora do label: abrir o menu não pode marcar a carteira */}
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={`Opções da carteira ${wallet.nickname}`} className="absolute right-[10px] top-[29px] flex h-8 w-6 cursor-pointer items-center justify-center rounded text-[#b39463] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d99558]"><EllipsisVertical size={18} strokeWidth={2.5} aria-hidden="true" /></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem asChild><Link to="/carteiras">Editar carteira</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  })}
                </div>}
        </section>

        <section aria-labelledby="wallet-provider-title" className="flex flex-col gap-4">
          <h2 id="wallet-provider-title" className="text-base font-bold leading-4 text-[#f5f1eb]">Carteira e rede</h2>
          <div role="radiogroup" aria-labelledby="wallet-provider-title" className="flex flex-col gap-4">
            {providers.map((option) => {
              const checked = provider === option.value
              return <label key={option.value} className={`flex h-[65px] cursor-pointer items-center gap-[11px] rounded-[15px] bg-[#241612] pl-[14px] pr-4 ${checked ? 'shadow-[0_0_40px_rgba(10,6,4,0.45)]' : 'shadow-[0_0_20px_rgba(10,6,4,0.45)]'} ${focusRing}`}>
                <input type="radio" name="wallet-provider" value={option.value} checked={checked} onChange={() => onSelectProvider(option.value)} className="sr-only" />
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-sm font-bold leading-[18px] text-[#e89b55]">{option.mark}</span>
                <span className="flex-1 text-sm leading-4 text-[#f5f1eb]">{option.label}</span>
                <RadioMark checked={checked} />
              </label>
            })}
          </div>
        </section>

        <p className="flex items-center justify-end gap-7"><span className="text-base font-bold leading-4 text-[#f5f1eb]">Total:</span><span className="text-[18px] font-bold leading-4 text-[#e89b55]">{totalEth ?? '0'} ETH</span></p>
      </div>

      <div className="flex flex-col gap-3">
        {quoteChanged && <div role="alert" className="flex flex-col gap-3 rounded-[14px] border border-[#f0805f] bg-[#2f1d15] px-4 py-3">
          <p className="text-sm leading-5 text-[#ffb59c]">Os valores mudaram enquanto você revisava. O novo total é {totalEth ?? '0'} ETH.</p>
          <button type="button" onClick={onReviewQuote} className="h-9 w-fit cursor-pointer rounded-[40px] border border-[#d28a4c] px-4 text-sm font-bold text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]">Revisar e continuar</button>
        </div>}
        {error && <p role="alert" className="text-xs text-[#ffb59c]">{error}</p>}
        <button type="button" disabled={!canConfirm} onClick={onConfirm} className="h-[60px] w-full cursor-pointer rounded-[40px] bg-[linear-gradient(93.21deg,#d28a4c_-3.96%,rgba(210,138,76,0.8)_121.97%)] text-[15px] font-bold leading-4 text-[#140d0a] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:cursor-not-allowed disabled:opacity-50">{confirming ? 'Confirmando…' : 'Confirmar compra'}</button>
      </div>
    </main>
  )
}
