import { Link } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AccountSidebar } from './account-sidebar'
import { SiteFooter } from './site-footer'
import { useSignOut } from './use-sign-out'
import { useAuthSession } from '../features/auth/queries'

const pageShell = 'mx-auto max-w-[1200px] px-6 sm:px-8 xl:px-0'
const segmentClass = 'flex h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-bold leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-[#d28a4c]'

// no mobile o menu lateral vira um cabeçalho: as duas seções reais em abas e o sair à mão, já que não há header
function MobileAccountHeader({ active }: { active: 'profile' | 'wallets' }) {
  const { signOut, isPending } = useSignOut()
  const segment = (current: boolean) => `${segmentClass} ${current ? 'bg-[#d28a4c] text-[#140d0a]' : 'text-[#e89b55]'}`

  return <div className="flex flex-col gap-5 md:hidden">
    <div className="flex items-center justify-between">
      <p className="text-xl font-bold leading-6 text-[#f5f1eb]">Minha conta</p>
      <button type="button" onClick={signOut} disabled={isPending} className="flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border border-[#3f2319] bg-transparent px-3 text-sm font-bold leading-4 text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:opacity-50">
        <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
        Sair
      </button>
    </div>
    <nav aria-label="Seções da conta" className="flex gap-1 rounded-[14px] bg-[#241612] p-1">
      <Link to="/perfil" aria-current={active === 'profile' ? 'page' : undefined} className={segment(active === 'profile')}>Dados do perfil</Link>
      <Link to="/carteiras" aria-current={active === 'wallets' ? 'page' : undefined} className={segment(active === 'wallets')}>Carteiras</Link>
    </nav>
  </div>
}

// o router já barra quem não tem token; aqui sobra tratar sessão expirada
export function AccountShell({ active, redirect, children }: { active: 'profile' | 'wallets'; redirect: string; children: ReactNode }) {
  const { data: user, isPending } = useAuthSession()

  if (isPending) {
    return <>
      <main className={`${pageShell} py-16`} role="status"><p className="text-sm text-[#cfb28c]">Carregando sua conta…</p></main>
      <SiteFooter />
    </>
  }

  if (!user) {
    return <>
      <main className={`${pageShell} py-16`}>
        <h1 className="text-[17px] font-bold leading-4">Sua sessão expirou</h1>
        <p className="mt-4 text-[15px] leading-6 text-[#cfb28c]">Entre de novo para ver e editar seus dados de colecionador.</p>
        <Button asChild className="mt-6 h-10 min-h-0 rounded-[6px] px-5"><Link to="/entrar" search={{ mode: 'login', redirect }}>Entrar</Link></Button>
      </main>
      <SiteFooter />
    </>
  }

  return <>
    <main className={`${pageShell} pt-8`}>
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <MobileAccountHeader active={active} />
        <div className="hidden md:contents"><AccountSidebar active={active} /></div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
    <SiteFooter />
  </>
}
