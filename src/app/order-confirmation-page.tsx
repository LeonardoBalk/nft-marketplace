import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrderReceipt, OrderRecord } from '../features/cart/contracts'
import { orderQuery } from '../features/cart/queries'
import { defaultCatalogSearch } from '../features/catalog/contracts'
import { OrderReceiptCard } from './order-receipt'

// confirmação é página: o cartão do frame fica sozinho sobre o fundo, sem header nem navegação
export function OrderConfirmationPage() {
  const { orderId } = useParams({ from: '/pedido/$orderId' })
  const order = useQuery(orderQuery(orderId))
  const navigate = useNavigate()
  const close = () => void navigate({ to: '/', search: defaultCatalogSearch, hash: 'catalogo' })
  const orderRecord = order.data as OrderRecord | undefined

  // items-start: o cartão tem a altura do conteúdo, sem esticar até o fim da tela
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-10 md:pb-24 md:pt-[200px]">
      {order.isPending
        ? <div role="status" aria-label="Carregando pedido" className="flex w-full max-w-[697px] flex-col gap-5 rounded-lg bg-[#241612] p-10"><Skeleton className="mx-auto size-[74px]" /><Skeleton className="mx-auto h-5 w-2/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>
        : order.isError
          ? <div role="alert" className="flex h-fit w-full max-w-[697px] flex-col items-center gap-4 rounded-lg bg-[#241612] px-6 py-10 text-center">
            <h1 className="text-[17px] font-bold leading-5 text-[#e89b55]">{isAxiosError(order.error) && order.error.response?.status === 404 ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
            <p className="text-sm leading-6 text-[#cfb28c]">{isAxiosError(order.error) && order.error.response?.status === 404 ? 'Confira o endereço ou volte ao catálogo.' : 'Tente novamente em instantes.'}</p>
            <div className="flex gap-3">
              {!(isAxiosError(order.error) && order.error.response?.status === 404) && <Button type="button" onClick={() => void order.refetch()} className="h-10 min-h-0 rounded-[6px] px-5 font-bold">Tentar novamente</Button>}
              <Button asChild variant="outline" className="h-10 min-h-0 rounded-[6px] px-5"><Link to="/" search={defaultCatalogSearch}>Voltar ao catálogo</Link></Button>
            </div>
          </div>
          : orderRecord?.status === 'pending'
            ? <section role="status" className="flex w-full max-w-[697px] flex-col items-center gap-4 rounded-lg bg-[#241612] px-6 py-12 text-center text-[#f5f1eb]">
              <span aria-hidden="true" className="size-10 animate-spin rounded-full border-2 border-[#3f2319] border-t-[#d28a4c]" />
              <h1 className="text-lg font-bold text-[#e89b55]">Pedido em processamento</h1>
              <p className="max-w-md text-sm leading-6 text-[#cfb28c]">Estamos aguardando a confirmação simulada do pagamento. Esta página será atualizada automaticamente.</p>
              <p className="text-xs text-[#cfb28c]">Pedido {orderRecord.orderId}</p>
              <Button type="button" variant="outline" onClick={() => void order.refetch()} className="h-10 min-h-0 rounded-[6px] px-5">Atualizar status</Button>
            </section>
            : orderRecord?.status === 'declined'
              ? <section role="alert" className="flex w-full max-w-[697px] flex-col items-center gap-4 rounded-lg bg-[#241612] px-6 py-12 text-center text-[#f5f1eb]">
                <h1 className="text-lg font-bold text-[#e89b55]">Não foi possível confirmar o pagamento</h1>
                <p className="max-w-md text-sm leading-6 text-[#cfb28c]">{orderRecord.declineReason ?? 'O pagamento foi recusado na simulação. Seu carrinho continua disponível para uma nova tentativa.'}</p>
                <p className="text-xs text-[#cfb28c]">Pedido {orderRecord.orderId}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild className="h-10 min-h-0 rounded-[6px] px-5"><Link to="/carrinho">Revisar carrinho</Link></Button>
                  <Button asChild variant="outline" className="h-10 min-h-0 rounded-[6px] px-5"><Link to="/" search={defaultCatalogSearch}>Voltar ao catálogo</Link></Button>
                </div>
              </section>
              : orderRecord?.status === 'confirmed' && typeof orderRecord.transactionHash === 'string'
                ? <OrderReceiptCard receipt={orderRecord as OrderReceipt} onClose={close} />
                : <div role="alert" className="text-sm text-[#cfb28c]">Não foi possível carregar o pedido.</div>}
    </main>
  )
}
