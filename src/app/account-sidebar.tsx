import { Link } from '@tanstack/react-router'
import { Activity, Download, Heart, LogOut, MapPin, ShoppingBag, TriangleAlert, User } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useLogout } from '../features/auth/queries'

const itemClass = 'flex h-[45px] items-center gap-3 px-4 text-[15px] leading-[45px] transition-colors'

// fora do escopo: aparecem para preservar o desenho, sem fingir que funcionam
const pendingItems = [
  { label: 'Atividade', icon: ShoppingBag },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: Activity },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: TriangleAlert },
]

export function AccountSidebar({ active }: { active: 'profile' | 'wallets' }) {
  const logout = useLogout()

  return (
    <nav aria-label="Minha conta" className="flex w-full flex-col bg-[#241612] py-2 lg:w-[310px] lg:shrink-0">
      <h2 className="flex h-9 items-center px-4 text-lg font-bold leading-4">Meu perfil</h2>

      <Link to="/perfil" aria-current={active === 'profile' ? 'page' : undefined} className={`${itemClass} ${active === 'profile' ? 'border-l-[6px] border-[#d28a4c] pl-[10px] text-[#e89b55]' : 'text-[#e89b55] hover:bg-[#2f1d15]'}`}>
        <User size={18} strokeWidth={1.8} className={active === 'profile' ? 'text-[#d28a4c]' : 'text-[#b39463]'} aria-hidden="true" />
        Dados do perfil
      </Link>
      <Link to="/carteiras" aria-current={active === 'wallets' ? 'page' : undefined} className={`${itemClass} ${active === 'wallets' ? 'border-l-[6px] border-[#d28a4c] pl-[10px] text-[#e89b55]' : 'text-[#e89b55] hover:bg-[#2f1d15]'}`}>
        <MapPin size={18} strokeWidth={1.8} className={active === 'wallets' ? 'text-[#d28a4c]' : 'text-[#b39463]'} aria-hidden="true" />
        Carteiras
      </Link>

      {pendingItems.map((item) => <span key={item.label} aria-disabled="true" title="Fora do escopo desta entrega" className={`${itemClass} cursor-not-allowed text-[#e89b55] opacity-60`}>
        <item.icon size={18} strokeWidth={1.8} className="text-[#b39463]" aria-hidden="true" />
        {item.label}
      </span>)}

      <Separator className="my-1" />
      <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="flex h-10 cursor-pointer items-center gap-2 border-0 bg-transparent px-4 text-[15px] font-bold leading-4 text-[#e89b55] transition-colors hover:bg-[#2f1d15] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:opacity-50">
        <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
        Sair
      </button>
    </nav>
  )
}
