import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountShell } from './account-shell'
import { walletSchema, type CollectorWallet, type WalletSlot } from '../features/account/contracts'
import { useRemoveWallet, useSaveWallet, useWallets } from '../features/account/queries'
import { ensSuffixes, walletNetworks, walletTypes } from '../features/cart/contracts'

const networkLabels: Record<(typeof walletNetworks)[number], string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
const walletLabels: Record<(typeof walletTypes)[number], string> = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' }

function fieldErrors(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object' || !('issues' in error)) return {}
  const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues
  const result: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    result[key] ??= issue.message
  }
  return result
}

function requestError(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback
}

function WalletForm({ slot, wallet, onSaved }: { slot: WalletSlot; wallet: CollectorWallet | null; onSaved?: () => void }) {
  const saveWallet = useSaveWallet()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const prefix = `${slot}-`

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setSaved(false)
    const raw = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = walletSchema.safeParse(raw)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    saveWallet.mutate({ slot, input: parsed.data }, { onSuccess: () => { setSaved(true); onSaved?.() } })
  }

  const requiredMark = <span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span>

  return (
    <form noValidate onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}displayName`} className="h-[29px]">Nome de exibição{requiredMark}</Label>
        <Input id={`${prefix}displayName`} name="displayName" defaultValue={wallet?.displayName} maxLength={80} aria-invalid={Boolean(errors.displayName)} />
        {errors.displayName && <p role="alert" className="text-xs text-[#ffb59c]">{errors.displayName}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}nickname`} className="h-[29px]">Apelido da carteira{requiredMark}</Label>
        <Input id={`${prefix}nickname`} name="nickname" defaultValue={wallet?.nickname} maxLength={60} aria-invalid={Boolean(errors.nickname)} />
        {errors.nickname && <p role="alert" className="text-xs text-[#ffb59c]">{errors.nickname}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}network`} className="h-[29px]">Rede{requiredMark}</Label>
        <Select name="network" defaultValue={wallet?.network}>
          <SelectTrigger id={`${prefix}network`}><SelectValue placeholder="Selecione uma rede" /></SelectTrigger>
          <SelectContent>{walletNetworks.map((value) => <SelectItem key={value} value={value}>{networkLabels[value]}</SelectItem>)}</SelectContent>
        </Select>
        {errors.network && <p role="alert" className="text-xs text-[#ffb59c]">{errors.network}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}profileName`} className="h-[29px]">Nome do perfil{requiredMark}</Label>
        <Input id={`${prefix}profileName`} name="profileName" defaultValue={wallet?.profileName} maxLength={80} aria-invalid={Boolean(errors.profileName)} />
        {errors.profileName && <p role="alert" className="text-xs text-[#ffb59c]">{errors.profileName}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}address`} className="h-[29px]">Endereço da carteira{requiredMark}</Label>
        <Input id={`${prefix}address`} name="address" defaultValue={wallet?.address} placeholder="Endereço 0x da carteira" maxLength={42} aria-invalid={Boolean(errors.address)} />
        {errors.address && <p role="alert" className="text-xs text-[#ffb59c]">{errors.address}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}secondaryAddress`} className="sr-only">ENS ou carteira secundária (opcional)</Label>
        <span aria-hidden="true" className="h-[29px]" />
        <Input id={`${prefix}secondaryAddress`} name="secondaryAddress" defaultValue={wallet?.secondaryAddress} placeholder="ENS ou carteira secundária (opcional)" maxLength={120} />
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}type`} className="h-[29px]">Tipo de carteira{requiredMark}</Label>
        <Select name="type" defaultValue={wallet?.type}>
          <SelectTrigger id={`${prefix}type`}><SelectValue placeholder="Selecione uma carteira" /></SelectTrigger>
          <SelectContent>{walletTypes.map((value) => <SelectItem key={value} value={value}>{walletLabels[value]}</SelectItem>)}</SelectContent>
        </Select>
        {errors.type && <p role="alert" className="text-xs text-[#ffb59c]">{errors.type}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}referralCode`} className="h-[29px]">Código de indicação{requiredMark}</Label>
        <Input id={`${prefix}referralCode`} name="referralCode" defaultValue={wallet?.referralCode} maxLength={40} aria-invalid={Boolean(errors.referralCode)} />
        {errors.referralCode && <p role="alert" className="text-xs text-[#ffb59c]">{errors.referralCode}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}email`} className="h-[29px]">E-mail{requiredMark}</Label>
        <Input id={`${prefix}email`} name="email" type="email" defaultValue={wallet?.email} aria-invalid={Boolean(errors.email)} />
        {errors.email && <p role="alert" className="text-xs text-[#ffb59c]">{errors.email}</p>}
      </div>
      <div className="flex max-w-[417px] flex-col gap-[10px]">
        <Label htmlFor={`${prefix}ensName`} className="h-[29px]">Nome ENS{requiredMark}</Label>
        <div className="flex gap-[10px]">
          <div className="w-[78px] shrink-0">
            <Select name="ensSuffix" defaultValue={wallet?.ensSuffix ?? '.eth'}>
              <SelectTrigger id={`${prefix}ensSuffix`} aria-label="Sufixo ENS"><SelectValue /></SelectTrigger>
              <SelectContent>{ensSuffixes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input id={`${prefix}ensName`} name="ensName" defaultValue={wallet?.ensName} maxLength={60} />
        </div>
      </div>
      <div className="flex items-center gap-4 lg:col-span-2">
        <Button type="submit" disabled={saveWallet.isPending} className="h-10 min-h-0 rounded-[3px] px-5 text-sm font-bold">{saveWallet.isPending ? 'Salvando…' : 'Salvar carteira'}</Button>
        {saveWallet.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(saveWallet.error, 'Não foi possível salvar a carteira.')}</p>}
        {saved && <p role="status" className="text-xs text-[#e89b55]">Carteira salva.</p>}
      </div>
    </form>
  )
}

function WalletsContent() {
  const wallets = useWallets()
  const saveWallet = useSaveWallet()
  const removeWallet = useRemoveWallet()
  const [secondaryOpen, setSecondaryOpen] = useState(false)

  if (wallets.isPending) {
    return <div className="flex flex-col gap-6" role="status" aria-label="Carregando carteiras">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[79px] w-full max-w-[417px]" />)}</div>
    </div>
  }

  if (wallets.isError) {
    return <p role="alert" className="text-sm text-[#ffb59c]">{requestError(wallets.error, 'Não foi possível carregar suas carteiras.')}</p>
  }

  const { primary, secondary } = wallets.data

  return (
    <div className="flex flex-col gap-10 pb-12">
      <section aria-labelledby="primary-wallet-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 id="primary-wallet-title" className="text-[17px] font-bold leading-4">Carteira principal</h1>
          <p className="text-sm leading-5 text-[#cfb28c]">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        </div>
        <WalletForm slot="primary" wallet={primary} />
      </section>

      <section aria-labelledby="secondary-wallet-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="secondary-wallet-title" className="text-[17px] font-bold leading-4">Carteira secundária</h2>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" disabled={!primary || saveWallet.isPending} onClick={() => { if (primary) saveWallet.mutate({ slot: 'secondary', input: { ...primary, nickname: `${primary.nickname} (secundária)` } }) }} className="h-9 min-h-0 rounded-[3px] px-4 text-sm">Igual à carteira principal</Button>
            <Button type="button" onClick={() => setSecondaryOpen(true)} className="h-9 min-h-0 rounded-[3px] px-4 text-sm font-bold">Adicionar</Button>
          </div>
        </div>
        {secondary
          ? <>
            <WalletForm slot="secondary" wallet={secondary} />
            <button type="button" disabled={removeWallet.isPending} onClick={() => removeWallet.mutate('secondary')} className="w-fit cursor-pointer border-0 bg-transparent text-sm text-[#cfb28c] underline transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:opacity-50">Remover carteira secundária</button>
          </>
          : secondaryOpen
            ? <WalletForm slot="secondary" wallet={null} onSaved={() => setSecondaryOpen(false)} />
            : <p className="text-sm leading-5 text-[#cfb28c]">Você ainda não adicionou uma carteira secundária.</p>}
      </section>
    </div>
  )
}

export function WalletsPage() {
  return <AccountShell active="wallets" redirect="/carteiras"><WalletsContent /></AccountShell>
}
