import { useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthModal } from '../auth/modal-context'
import { useAuthSession } from '../auth/queries'
import { useFavorites, useToggleFavorite } from './queries'

export function FavoriteButton({ nftId, nftName, className, size = 15, showLabel = false }: { nftId: string; nftName: string; className?: string; size?: number; showLabel?: boolean }) {
  const { data: user } = useAuthSession()
  const { openAuth } = useAuthModal()
  const { nftIds } = useFavorites(Boolean(user))
  const toggle = useToggleFavorite()
  const href = useRouterState({ select: (state) => state.location.href })
  const [requestError, setRequestError] = useState('')
  const favorited = nftIds.includes(nftId)

  // favoritar exige sessão: sem ela o modal abre e devolve a pessoa a esta tela
  const press = () => {
    if (!user) {
      openAuth('login', href)
      return
    }
    setRequestError('')
    toggle.mutate({ nftId, favorited: !favorited }, {
      onError: () => setRequestError('Não foi possível atualizar os favoritos. Tente novamente.'),
    })
  }

  return <>
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={`${favorited ? 'Remover' : 'Adicionar'} ${nftName} ${favorited ? 'dos' : 'aos'} favoritos`}
      onClick={press}
      className={cn('inline-flex cursor-pointer items-center justify-center gap-2 border border-[#3f2319] bg-[#2f1d15] text-[#d28a4c] transition-colors hover:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558]', className)}
    >
      <Heart size={size} strokeWidth={1.8} className={favorited ? 'fill-[#d28a4c]' : ''} aria-hidden="true" />
      {showLabel && <span className="text-sm font-medium leading-4 text-[#e89b55]">Favoritar</span>}
    </button>
    {requestError && <span role="alert" className="sr-only">{requestError}</span>}
  </>
}
