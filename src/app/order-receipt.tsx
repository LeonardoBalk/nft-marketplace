import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../components/ui/button'
import type { OrderReceipt } from '../features/cart/contracts'

const walletLabels = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' } as const
const networkLabels = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

function tokenId(nftId: string) {
  return `#${(nftId.match(/\d+$/)?.[0] ?? '0').padStart(4, '0')}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

function formatDate(iso: string) {
  const date = new Date(iso)
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${String(date.getDate()).padStart(2, '0')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}

function ThankYouMark() {
  return (
    <svg width="78" height="74" viewBox="0 0 78 74" fill="none" aria-hidden="true" className="text-[#d28a4c]">
      <rect x="9" y="12" width="60" height="50" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M9 18 39 42 69 18" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="22" y="2" width="34" height="26" rx="3" fill="#241612" stroke="currentColor" strokeWidth="2.5" />
      <text x="39" y="13" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="700" fontFamily="inherit">THANK</text>
      <text x="39" y="23" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="700" fontFamily="inherit">YOU</text>
    </svg>
  )
}

// o recibo da página de confirmação; reproduz o snapshot do pedido, não o catálogo atual
export function OrderReceiptCard({ receipt, onClose }: { receipt: OrderReceipt; onClose: () => void }) {
  const [explorerNotice, setExplorerNotice] = useState(false)
  const { summary } = receipt

  return (
    <article aria-labelledby="receipt-title" className="w-full max-w-[697px] overflow-hidden rounded-lg bg-[#241612] text-[#f5f1eb] shadow-[0_18px_70px_rgba(0,0,0,0.55)]">
      <div className="relative flex flex-col gap-5 px-6 pb-0 pt-10 sm:px-12">
        <button type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 inline-flex size-6 cursor-pointer items-center justify-center text-[#d28a4c] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><X size={20} strokeWidth={1.8} /></button>

        <div className="flex flex-col items-center gap-4">
          <ThankYouMark />
          <h1 id="receipt-title" className="text-center text-[17px] font-bold leading-5 text-[#e89b55]">Seus NFTs agora estão na sua carteira</h1>
        </div>

        {/* faixa de borda a borda como no frame: anula o padding do cartão e as colunas seguem o conteúdo */}
        <dl className="-mx-6 grid grid-cols-2 gap-y-4 border-y border-[#d28a4c] px-6 py-4 text-[15px] leading-5 sm:-mx-12 sm:flex sm:justify-between sm:divide-x sm:divide-[#3f2319] sm:px-11">
          <div className="flex flex-col gap-1 whitespace-nowrap sm:px-5 sm:first:pl-0">
            <dt className="font-bold">ID da transação</dt>
            <dd className="text-[#cfb28c]" title={receipt.transactionHash}>{shortHash(receipt.transactionHash)}</dd>
          </div>
          <div className="flex flex-col gap-1 whitespace-nowrap sm:px-5">
            <dt className="text-[#cfb28c]">Data</dt>
            <dd>{formatDate(receipt.createdAt)}</dd>
          </div>
          <div className="flex flex-col gap-1 whitespace-nowrap sm:px-5">
            <dt className="text-[#cfb28c]">Total</dt>
            <dd>{summary.totalEth} ETH</dd>
          </div>
          <div className="flex flex-col gap-1 whitespace-nowrap sm:px-5">
            <dt className="text-[#cfb28c]">Carteira</dt>
            <dd>{walletLabels[receipt.wallet]}</dd>
          </div>
        </dl>

        <section aria-labelledby="receipt-details" className="flex flex-col gap-3">
          <h2 id="receipt-details" className="text-[15px] font-bold leading-4">Detalhes da transação</h2>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#3f2319] pb-3 text-base font-bold leading-4 sm:grid-cols-[minmax(0,1fr)_72px_104px]">
            <span>NFTs</span>
            <span className="hidden text-center sm:block">Edições</span>
            <span className="text-right">Subtotal</span>
          </div>
          <ul className="flex flex-col gap-3">
            {summary.items.map((line) => <li key={`${line.nft.id}:${line.edition}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_72px_104px]">
              <div className="flex min-w-0 items-center gap-3">
                <img src={line.nft.artwork} alt="" loading="lazy" width="70" height="70" className="size-14 shrink-0 rounded-lg object-cover sm:size-[70px]" />
                <div className="flex min-w-0 flex-col gap-[6px]">
                  <p className="truncate text-base font-bold leading-4">{line.nft.name}</p>
                  <p className="text-sm leading-4 text-[#b39463]">ID do token: {tokenId(line.nft.id)} · Edição: {line.edition}</p>
                </div>
              </div>
              {/* no mobile a quantidade sobe para cima do subtotal; acima de sm o contêiner some e voltam as três colunas */}
              <div className="flex flex-col items-end gap-1 sm:contents">
                <span className="text-sm leading-4 text-[#cfb28c] sm:text-center">(x {line.quantity})</span>
                <span className="text-right text-[18px] font-bold leading-4 text-[#e89b55] tabular-nums">{line.lineTotalEth} ETH</span>
              </div>
            </li>)}
          </ul>
          <div className="mt-1 flex items-center justify-between border-t border-[#3f2319] pt-3 text-[15px] leading-5">
            <span>Taxa de rede</span>
            <span className="text-[18px] leading-4">{summary.networkFeeEth} ETH</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold leading-4">Total</span>
            <span className="text-[18px] font-bold leading-4 text-[#e89b55]">{summary.totalEth} ETH</span>
          </div>
        </section>

        <p className="text-center text-sm leading-6 text-[#cfb28c]">Transação confirmada na {networkLabels[receipt.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.</p>

        <div className="flex flex-col items-center gap-2 pb-8">
          <Button type="button" aria-describedby="explorer-notice" onClick={() => setExplorerNotice(true)} className="h-[45px] min-h-0 rounded-[6px] px-6 text-base font-bold">Ver no Etherscan</Button>
          <p id="explorer-notice" className="text-center text-xs leading-5 text-[#cfb28c]">{explorerNotice ? `Transação simulada: o hash ${shortHash(receipt.transactionHash)} não existe em um explorador público.` : 'Pedido ' + receipt.orderId}</p>
        </div>

        <div aria-hidden="true" className="absolute bottom-0 left-0 h-[10px] w-full bg-[#d28a4c]" />
      </div>
    </article>
  )
}
