import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cartKey, mergeGuestCart } from '../features/cart/queries'
import { getAccessToken } from '../features/auth/session'

const pendingKey = 'kurio.cart.merge-pending.v1'

export function CartMergeNotice() {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const automaticRetryStarted = useRef(false)

  const retry = useCallback(async () => {
    if (!getAccessToken()) return
    setRetrying(true)
    try {
      const cart = await mergeGuestCart()
      queryClient.setQueryData(cartKey, cart)
      sessionStorage.removeItem(pendingKey)
      setPending(false)
    } catch {
      setPending(true)
    } finally {
      setRetrying(false)
    }
  }, [queryClient])

  useEffect(() => {
    if (sessionStorage.getItem(pendingKey) === '1') setPending(true)
    const failed = () => setPending(true)
    const ended = () => { sessionStorage.removeItem(pendingKey); setPending(false) }
    window.addEventListener('kurio:cart-merge-failed', failed)
    window.addEventListener('kurio:session-ended', ended)
    return () => {
      window.removeEventListener('kurio:cart-merge-failed', failed)
      window.removeEventListener('kurio:session-ended', ended)
    }
  }, [])

  useEffect(() => {
    if (!pending || automaticRetryStarted.current) return
    automaticRetryStarted.current = true
    const timer = window.setTimeout(() => { void retry() }, 1200)
    return () => window.clearTimeout(timer)
  }, [pending, retry])

  if (!pending) return null
  return <div role="alert" className="mx-auto mt-4 flex max-w-[1200px] flex-wrap items-center gap-3 border border-[#f0805f] bg-[#2f1d15] px-5 py-3 text-sm text-[#ffb59c]">
    <span>Não foi possível trazer os itens do carrinho de visitante. Seus itens estão guardados.</span>
    <button type="button" disabled={retrying} onClick={() => void retry()} className="font-bold text-[#e89b55] underline disabled:opacity-50">{retrying ? 'Tentando…' : 'Tentar novamente'}</button>
  </div>
}
