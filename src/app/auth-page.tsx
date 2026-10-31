import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Eye, EyeOff, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '../features/auth/contracts'
import { useAuthModal, type AuthMode } from '../features/auth/modal-context'
import { useLogin, useRegister } from '../features/auth/queries'

function authError(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? 'Não foi possível concluir. Tente novamente.'
  return 'Não foi possível concluir. Tente novamente.'
}

const fieldClass = 'h-10 w-full max-w-[340px] rounded-[5px] border border-[#3f2319] bg-transparent px-4 text-sm leading-4 text-[#f5f1eb] placeholder:text-[#b39463] focus-visible:outline-2 focus-visible:outline-[#d28a4c]'
const labelClass = 'sr-only'

function SocialButtons() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 sm:px-10">
      <Button type="button" variant="outline" disabled title="Fora do escopo desta entrega" className="h-10 w-full gap-3 border-[#3f2319] bg-transparent text-[13px] font-medium text-[#cfb28c] opacity-100 disabled:cursor-not-allowed disabled:opacity-100" style={{ maxWidth: 340, borderRadius: 5 }}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" focusable="false">
          <path fill="#4285F4" d="M23.49 12.275c0-.806-.072-1.582-.205-2.327H12v4.404h6.448a5.51 5.51 0 0 1-2.391 3.614v3.002h3.871c2.266-2.087 3.562-5.163 3.562-8.693Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.956-1.075 7.94-2.91l-3.87-3.002c-1.075.72-2.45 1.146-4.07 1.146-3.129 0-5.78-2.111-6.729-4.951H1.269v3.097A11.995 11.995 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.271 14.283A7.21 7.21 0 0 1 4.896 12c0-.792.136-1.563.375-2.283V6.62H1.269A11.996 11.996 0 0 0 0 12c0 1.936.465 3.762 1.269 5.38l4.002-3.097Z" />
          <path fill="#EA4335" d="M12 4.766c1.765 0 3.349.607 4.596 1.8l3.448-3.448C17.951 1.19 15.235 0 12 0 7.31 0 3.256 2.69 1.269 6.62l4.002 3.097C6.22 6.877 8.871 4.766 12 4.766Z" />
        </svg>
        Continuar com Google
      </Button>
      <Button type="button" variant="outline" disabled title="Fora do escopo desta entrega" className="h-10 w-full gap-3 border-[#3f2319] bg-transparent text-[13px] font-medium text-[#cfb28c] opacity-100 disabled:cursor-not-allowed disabled:opacity-100" style={{ maxWidth: 340, borderRadius: 5 }}>
        <span aria-hidden="true" className="text-[22px] font-bold leading-none text-[#3b5999]">f</span>
        Continuar com Facebook
      </Button>
    </div>
  )
}

export function AuthPage({ mode, redirect, onClose }: { mode: AuthMode; redirect?: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const { openAuth } = useAuthModal()
  const login = useLogin()
  const register = useRegister()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isRegister = mode === 'register'
  const busy = login.isPending || register.isPending
  const requestError = login.error ?? register.error

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    dialog.focus({ preventScroll: true })
    const onCancel = (event: Event) => {
      event.preventDefault()
      close()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
    }
  }, [close])

  const completeAuth = () => {
    close()
    if (!redirect) return
    try {
      const destination = new URL(redirect, window.location.origin)
      const sameOrigin = destination.origin === window.location.origin
      const relative = redirect.startsWith('/') && !/^[/\\]{2}/.test(redirect)
      if (!sameOrigin || !relative) return
      const target = `${destination.pathname}${destination.search}${destination.hash}`
      // preservar a pagina e o formulario preenchido
      if (target !== `${window.location.pathname}${window.location.search}${window.location.hash}`) void router.navigate({ to: target })
    } catch {
      return
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    const raw = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = isRegister ? registerSchema.safeParse(raw) : loginSchema.safeParse(raw)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        nextErrors[key] ??= issue.message
      }
      setErrors(nextErrors)
      return
    }

    try {
      if (isRegister) await register.mutateAsync(parsed.data as RegisterInput)
      else await login.mutateAsync(parsed.data as LoginInput)
      completeAuth()
    } catch {
      // mostrar o erro retornado pela api
    }
  }

  const tabClass = (active: boolean) => `flex h-5 cursor-pointer items-center border-0 bg-transparent p-0 text-xl font-medium leading-4 transition-colors ${active ? 'text-[#e89b55]' : 'text-[#f5f1eb] hover:text-[#e89b55]'}`

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-labelledby="auth-dialog-title"
      aria-modal="true"
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
      className="fixed inset-0 m-auto overflow-y-auto border-0 bg-[#241612] p-0 text-[#f5f1eb] shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop:bg-black/70"
      style={{ height: isRegister ? 656 : 440, maxHeight: 'calc(100dvh - 32px)', width: 'min(500px, calc(100vw - 32px))', borderRadius: 8, outline: 'none' }}
    >
      <div className="relative w-full" style={{ minHeight: isRegister ? 656 : 440 }}>
        <header className="flex flex-col items-center pt-12" style={{ height: isRegister ? 140 : 68 }}>
          <nav aria-label="Acesso à conta" className="flex h-5 items-center justify-center gap-2">
            <button type="button" onClick={() => openAuth('login', redirect)} aria-current={!isRegister ? 'page' : undefined} className={tabClass(!isRegister)}>Entrar</button>
            <span aria-hidden="true" className="h-5 w-px bg-[#f0805f]" />
            <button type="button" onClick={() => openAuth('register', redirect)} aria-current={isRegister ? 'page' : undefined} className={tabClass(isRegister)}>Criar conta</button>
          </nav>
          {isRegister && <p className="mt-10 text-center text-[13px] leading-4 text-[#f5f1eb]" style={{ height: 32, width: 'min(404px, calc(100% - 32px))' }}>Crie seu perfil de colecionador e conecte uma carteira quando quiser.</p>}
        </header>

        <h1 id="auth-dialog-title" className="sr-only">{isRegister ? 'Criar conta' : 'Entrar'}</h1>

        <form id="auth-form" className="flex flex-col items-center gap-3 px-4 pt-6 sm:px-10" style={{ minHeight: isRegister ? 220 : 116 }} onSubmit={(event) => void onSubmit(event)} noValidate>
          {isRegister && <div className="w-full" style={{ maxWidth: 340 }}><label className={labelClass} htmlFor="auth-name">Nome de usuário</label><input id="auth-name" name="name" placeholder="Nome de usuário" autoComplete="name" required maxLength={80} className={fieldClass} style={{ maxWidth: 340, borderRadius: 5 }} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'auth-name-error' : undefined} />{errors.name && <p id="auth-name-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.name}</p>}</div>}
          <div className="w-full" style={{ maxWidth: 340 }}><label className={labelClass} htmlFor="auth-email">E-mail</label><input id="auth-email" name="email" type="email" placeholder="Digite seu e-mail" autoComplete="email" required className={fieldClass} style={{ maxWidth: 340, borderRadius: 5 }} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'auth-email-error' : undefined} />{errors.email && <p id="auth-email-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.email}</p>}</div>
          <div className="relative w-full" style={{ maxWidth: 340 }}><label className={labelClass} htmlFor="auth-password">Senha</label><input id="auth-password" name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Senha" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} className={`${fieldClass} pr-11`} style={{ maxWidth: 340, borderRadius: 5 }} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'auth-password-error' : undefined} /><button type="button" aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-2 top-1/2 mt-[-2px] inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#b39463] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">{passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}</button>{errors.password && <p id="auth-password-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.password}</p>}</div>
          {isRegister && <div className="w-full" style={{ maxWidth: 340 }}><label className={labelClass} htmlFor="auth-confirm-password">Confirmar senha</label><input id="auth-confirm-password" name="confirmPassword" type={passwordVisible ? 'text' : 'password'} placeholder="Confirmar senha" autoComplete="new-password" required minLength={8} className={fieldClass} style={{ maxWidth: 340, borderRadius: 5 }} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'auth-confirm-password-error' : undefined} />{errors.confirmPassword && <p id="auth-confirm-password-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.confirmPassword}</p>}</div>}
          {requestError && <p role="alert" className="w-full max-w-[340px] rounded border border-[#9d5947] bg-[#46251f] px-3 py-2 text-xs text-[#ffd5c6]">{authError(requestError)}</p>}
        </form>

        <section aria-label="Enviar formulário" className="flex flex-col items-center px-4 pt-6 sm:px-10" style={{ height: 69 }}>
          <Button type="submit" form="auth-form" disabled={busy} className="h-[45px] w-full text-base font-bold" style={{ maxWidth: 340, height: 45, borderRadius: 5 }}>{busy ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}</Button>
        </section>

        <section aria-label="Outras opções de acesso" className="flex flex-col gap-4 pt-6" style={{ height: 152 }}>
          <div className="flex h-4 w-full items-center gap-3 text-[13px] leading-4 text-[#f5f1eb]">
            <span aria-hidden="true" className="h-px flex-1 bg-[#3f2319]" />
            <span className="shrink-0">Ou continue com</span>
            <span aria-hidden="true" className="h-px flex-1 bg-[#3f2319]" />
          </div>
          <SocialButtons />
        </section>

        <button type="button" aria-label="Fechar" onClick={close} className="absolute right-4 top-4 inline-flex size-6 cursor-pointer items-center justify-center text-[#d28a4c] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]"><X size={20} strokeWidth={1.5} /></button>
        <div aria-hidden="true" className="absolute bottom-0 left-0 w-full bg-[#d28a4c]" style={{ height: 10 }} />
      </div>
    </dialog>
  )
}
