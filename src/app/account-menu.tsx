import { Link } from '@tanstack/react-router'
import { Heart, LogOut, MapPin, User } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { AuthUser } from '../features/auth/contracts'
import { useSignOut } from './use-sign-out'

// sem foto, o avatar mostra as iniciais do nome; sem nome, a primeira letra do e-mail
function initialsOf(user: AuthUser): string {
  const parts = (user.name.trim() || user.email).split(/\s+/).filter(Boolean)
  const initials = (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  return initials.toLocaleUpperCase('pt-BR') || '?'
}

const itemIconClass = 'text-[#b39463]'

export function AccountMenu({ user }: { user: AuthUser }) {
  const { signOut, isPending } = useSignOut()
  const displayName = user.name.trim() || user.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Menu da conta de ${displayName}`} className="inline-flex size-[35px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#3f2319] bg-[#d28a4c] text-[13px] font-bold leading-none text-[#140d0a] transition-colors hover:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] data-[state=open]:border-[#e89b55]">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : <span aria-hidden="true">{initialsOf(user)}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-bold leading-5">{displayName}</span>
          {user.name.trim() && <span className="truncate text-xs leading-4 text-[#b39463]">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* os mesmos destinos e ícones do menu lateral da conta */}
        <DropdownMenuItem asChild><Link to="/perfil"><User size={16} strokeWidth={1.8} className={itemIconClass} aria-hidden="true" />Dados do perfil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/carteiras"><MapPin size={16} strokeWidth={1.8} className={itemIconClass} aria-hidden="true" />Carteiras</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/favoritos" search={{ page: 1 }}><Heart size={16} strokeWidth={1.8} className={itemIconClass} aria-hidden="true" />Favoritos</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onSelect={signOut} className="font-bold text-[#e89b55]"><LogOut size={16} strokeWidth={1.8} aria-hidden="true" />Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
