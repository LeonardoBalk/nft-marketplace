import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AccountSidebar } from './account-sidebar'
import { SiteFooter } from './site-footer'
import { useAuthSession } from '../features/auth/queries'

const pageShell = 'mx-auto max-w-[1200px] px-5 sm:px-8 xl:px-0'

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
        <AccountSidebar active={active} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
    <SiteFooter />
  </>
}
