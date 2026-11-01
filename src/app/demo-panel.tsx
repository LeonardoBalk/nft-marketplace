import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, TimerOff, Wrench, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthSession } from '../features/auth/queries'
import type { DemoScenario } from '../mocks/demo-scenario'
import { api } from '../shared/api/client'

type ScenarioPatch = Partial<DemoScenario>

// cada perfil de rede vira um patch do cenário; a falha cobre a chamada e as duas tentativas automáticas do catálogo
const networkPresets: Array<{ id: string; label: string; hint: string; patch: ScenarioPatch }> = [
  { id: 'normal', label: 'Rede normal', hint: 'Respostas imediatas.', patch: { latencyMs: 0, latencySequenceMs: [], nextFailure: null } },
  { id: 'slow', label: 'Rede lenta', hint: '1,5 s por resposta: mostra os skeletons.', patch: { latencyMs: 1500, latencySequenceMs: [], nextFailure: null } },
  { id: 'jitter', label: 'Latência variável', hint: 'Respostas chegam fora de ordem.', patch: { latencyMs: 0, latencySequenceMs: [900, 120, 1600, 300, 60], nextFailure: null } },
  { id: 'http', label: 'Catálogo com erro 500', hint: 'Falha 3 vezes; tentar de novo recupera.', patch: { latencyMs: 0, latencySequenceMs: [], nextFailure: { path: '/api/nfts', kind: 'http', status: 500, remaining: 3 } } },
  { id: 'offline', label: 'Catálogo sem conexão', hint: 'A rede cai 3 vezes e volta.', patch: { latencyMs: 0, latencySequenceMs: [], nextFailure: { path: '/api/nfts', kind: 'offline', remaining: 3 } } },
]

function activePreset(scenario: DemoScenario) {
  if (scenario.nextFailure?.path === '/api/nfts') return scenario.nextFailure.kind === 'offline' ? 'offline' : 'http'
  if (scenario.latencySequenceMs.length) return 'jitter'
  return scenario.latencyMs > 0 ? 'slow' : 'normal'
}

const sectionTitle = 'text-xs font-bold uppercase leading-4 tracking-[0.08em] text-[#b39463]'
const actionButton = 'flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#3f2319] bg-transparent px-3 text-[13px] font-bold leading-4 text-[#e89b55] transition-colors hover:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:cursor-not-allowed disabled:opacity-50'
const otherQueries = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== 'demo' }

// só existe com os mocks ligados: troca o cenário do msw sem abrir o console
export function DemoPanel({ raised, initiallyOpen = false }: { raised: boolean; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const panelId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const queryClient = useQueryClient()
  const { data: user } = useAuthSession()
  const scenario = useQuery({ queryKey: ['demo', 'scenario'], queryFn: async () => (await api.get<DemoScenario>('/demo/scenario')).data, enabled: open })

  // o cenário vale já: refaz as consultas ativas para a tela mostrar o efeito
  const update = useMutation({
    mutationFn: async (patch: ScenarioPatch) => (await api.put<DemoScenario>('/demo/scenario', patch)).data,
    onSuccess: (next) => {
      queryClient.setQueryData(['demo', 'scenario'], next)
      void queryClient.invalidateQueries(otherQueries)
    },
  })
  const expireSession = useMutation({
    mutationFn: () => api.post('/demo/session/expire'),
    onSuccess: () => void queryClient.invalidateQueries(otherQueries),
  })
  // o reset apaga o que todas as camadas persistiram: recarregar é o jeito honesto de partir do zero
  const resetAll = useMutation({ mutationFn: () => api.post('/demo/reset'), onSuccess: () => window.location.reload() })

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      // o select do radix fecha primeiro o próprio menu
      if (event.key !== 'Escape' || event.defaultPrevented) return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const data = scenario.data
  const busy = update.isPending

  // à direita: os rótulos dos formulários e o menu de filtros começam na esquerda
  // no mobile, sem tab bar a rota tem um botão fixo embaixo (comprar, confirmar): o painel sai do caminho
  return <div data-demo-panel className={`fixed right-4 z-40 flex-col-reverse items-end gap-3 md:bottom-6 md:right-6 md:flex ${raised ? 'bottom-[calc(150px+env(safe-area-inset-bottom))] flex' : 'hidden'}`}>
    <button ref={triggerRef} type="button" aria-expanded={open} aria-controls={panelId} aria-label={open ? 'Fechar modo demonstração' : 'Abrir modo demonstração'} onClick={() => setOpen((value) => !value)}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-[#55321f] bg-[#241612]/95 text-[#e89b55] shadow-[0_8px_24px_rgba(20,13,10,0.5)] transition-colors hover:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d28a4c]">
      {open ? <X size={18} strokeWidth={1.8} aria-hidden="true" /> : <Wrench size={18} strokeWidth={1.8} aria-hidden="true" />}
    </button>

    {open && <div ref={panelRef} id={panelId} role="region" aria-labelledby={`${panelId}-title`} tabIndex={-1}
      className="flex max-h-[min(640px,calc(100dvh-220px))] w-[min(340px,calc(100vw-32px))] flex-col gap-5 overflow-y-auto rounded-[14px] border border-[#3f2319] bg-[#1b110d] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] outline-none md:max-h-[min(640px,calc(100dvh-96px))]">
      <div className="flex flex-col gap-1">
        <h2 id={`${panelId}-title`} className="text-base font-bold leading-5 text-[#f5f1eb]">Modo demonstração</h2>
        <p className="text-xs leading-4 text-[#cfb28c]">Simula rede e pagamento nos mocks. Fica salvo neste navegador.</p>
      </div>

      {!data
        ? <p role="status" className="text-xs text-[#cfb28c]">{scenario.isError ? 'Não foi possível ler o cenário.' : 'Carregando cenário…'}</p>
        : <>
          <section aria-labelledby={`${panelId}-network`} className="flex flex-col gap-3">
            <h3 id={`${panelId}-network`} className={sectionTitle}>Rede</h3>
            <RadioGroup value={activePreset(data)} disabled={busy} aria-labelledby={`${panelId}-network`} onValueChange={(value) => update.mutate(networkPresets.find((preset) => preset.id === value)!.patch)} className="gap-1">
              {networkPresets.map((preset) => <Label key={preset.id} htmlFor={`${panelId}-${preset.id}`} className="flex cursor-pointer items-start gap-3 rounded-[8px] px-2 py-2 has-[[data-state=checked]]:bg-[#241612]">
                <RadioGroupItem id={`${panelId}-${preset.id}`} value={preset.id} className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm leading-4 text-[#f5f1eb]">{preset.label}</span>
                  <span className="text-xs leading-4 text-[#b39463]">{preset.hint}</span>
                </span>
              </Label>)}
            </RadioGroup>
          </section>

          <section aria-labelledby={`${panelId}-purchase`} className="flex flex-col gap-3">
            <h3 id={`${panelId}-purchase`} className={sectionTitle}>Compra</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${panelId}-wallet`} className="text-xs leading-4 text-[#cfb28c]">Carteira</Label>
                <Select value={data.walletOutcome} disabled={busy} onValueChange={(value) => update.mutate({ walletOutcome: value as DemoScenario['walletOutcome'] })}>
                  <SelectTrigger id={`${panelId}-wallet`} className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Conecta</SelectItem>
                    <SelectItem value="refused">Recusa</SelectItem>
                    <SelectItem value="disconnected">Desconecta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${panelId}-payment`} className="text-xs leading-4 text-[#cfb28c]">Pagamento</Label>
                <Select value={data.paymentOutcome} disabled={busy} onValueChange={(value) => update.mutate({ paymentOutcome: value as DemoScenario['paymentOutcome'] })}>
                  <SelectTrigger id={`${panelId}-payment`} className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Aprovado</SelectItem>
                    <SelectItem value="declined">Recusado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Label htmlFor={`${panelId}-settlement`} className="flex cursor-pointer items-center gap-3 text-sm leading-4 text-[#f5f1eb]">
              <Checkbox id={`${panelId}-settlement`} checked={data.settlementDelayMs > 5_000} disabled={busy} onCheckedChange={(checked) => update.mutate({ settlementDelayMs: checked === true ? 8_000 : 650 })} />
              Liquidação demorada (8 s)
            </Label>
            <Label htmlFor={`${panelId}-events`} className="flex cursor-pointer items-center gap-3 text-sm leading-4 text-[#f5f1eb]">
              <Checkbox id={`${panelId}-events`} checked={data.dropOrderEvents} disabled={busy} onCheckedChange={(checked) => update.mutate({ dropOrderEvents: checked === true })} />
              Perder eventos do pedido
            </Label>
          </section>
        </>}

      {update.isError && <p role="alert" className="text-xs text-[#ffb59c]">Não foi possível aplicar o cenário.</p>}

      <div className="flex gap-2 border-t border-[#3f2319] pt-4">
        {user && <button type="button" disabled={expireSession.isPending} onClick={() => expireSession.mutate()} className={actionButton}><TimerOff size={14} strokeWidth={1.8} aria-hidden="true" />Expirar sessão</button>}
        <button type="button" disabled={resetAll.isPending} onClick={() => resetAll.mutate()} className={actionButton}><RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />Restaurar tudo</button>
      </div>
    </div>}
  </div>
}
