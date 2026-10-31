import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { ChevronLeft, Eye, EyeOff, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '../features/auth/contracts'
import { useAuthModal, type AuthMode } from '../features/auth/modal-context'
import { useLogin, useRegister } from '../features/auth/queries'

function authError(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? 'Não foi possível concluir. Tente novamente.'
  return 'Não foi possível concluir. Tente novamente.'
}

const fieldClass = 'h-10 w-full rounded-[5px] border border-[#3f2319] bg-transparent px-4 text-sm leading-4 text-[#f5f1eb] placeholder:text-[#b39463] focus-visible:outline-2 focus-visible:outline-[#d28a4c] max-md:h-[50px] max-md:rounded-[10px] max-md:text-sm'
const labelClass = 'sr-only'

function SocialButtons() {
  return (
    <div className="flex w-full flex-col items-center gap-4 px-4 md:px-10 max-md:px-0">
      <Button type="button" variant="outline" disabled className="h-10 w-full gap-3 rounded-[5px] border-[#3f2319] bg-transparent text-[13px] font-medium text-[#cfb28c] opacity-100 disabled:opacity-100 md:max-w-[340px] max-md:max-w-none">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" focusable="false">
          <path fill="#4086F4" d="M23.49 12.275c0-.806-.072-1.582-.205-2.327H12v4.404h6.448a5.51 5.51 0 0 1-2.391 3.614v3.002h3.871c2.266-2.087 3.562-5.163 3.562-8.693Z" />
          <path fill="#59C36A" d="M12 24c3.24 0 5.956-1.075 7.94-2.91l-3.87-3.002c-1.075.72-2.45 1.146-4.07 1.146-3.129 0-5.78-2.111-6.729-4.951H1.269v3.097A11.995 11.995 0 0 0 12 24Z" />
          <path fill="#FFDA2D" d="M5.271 14.283A7.21 7.21 0 0 1 4.896 12c0-.792.136-1.563.375-2.283V6.62H1.269A11.996 11.996 0 0 0 0 12c0 1.936.465 3.762 1.269 5.38l4.002-3.097Z" />
          <path fill="#FF641A" d="M12 4.766c1.765 0 3.349.607 4.596 1.8l3.448-3.448C17.951 1.19 15.235 0 12 0 7.31 0 3.256 2.69 1.269 6.62l4.002 3.097C6.22 6.877 8.871 4.766 12 4.766Z" />
        </svg>
        Continuar com Google
      </Button>
      <Button type="button" variant="outline" disabled className="h-10 w-full gap-3 rounded-[5px] border-[#3f2319] bg-transparent text-[13px] font-medium text-[#cfb28c] opacity-100 disabled:opacity-100 md:max-w-[340px] max-md:max-w-none">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" focusable="false" className="shrink-0">
          <path fill="#3B5999" d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.3 1.5-4.3 4.4v2.2H7.2v3.2H10V21h3.5Z" />
        </svg>
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
  const [resetNotice, setResetNotice] = useState('')
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
    setResetNotice('')
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
      className={`fixed inset-0 m-auto w-[min(500px,calc(100vw-32px))] overflow-y-auto border-0 bg-[#241612] p-0 text-[#f5f1eb] shadow-[0_18px_70px_rgba(0,0,0,0.55)] outline-none backdrop:bg-black/70 md:max-h-[calc(100dvh-32px)] md:rounded-[8px] max-md:h-[min(896px,100dvh)] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-[414px] max-md:bg-[#140d0a] ${isRegister ? 'md:h-[656px]' : 'md:h-[440px]'}`}
    >
      <div className={`relative w-full max-md:flex max-md:h-full max-md:flex-col max-md:gap-10 max-md:px-7 max-md:pt-20 max-md:pb-6 ${isRegister ? 'md:min-h-[656px]' : 'md:min-h-[440px]'}`}>
        <header className={`flex shrink-0 flex-col items-center pt-12 max-md:h-[136px] max-md:justify-center max-md:p-0 ${isRegister ? 'md:h-[140px]' : 'md:h-[68px]'}`}>
          <span aria-label="Kurio" className="hidden font-mono text-[32px] font-bold leading-[42px] tracking-[0.1em] text-[#f5f1eb] max-md:block">KURIO</span>
          <nav aria-label="Acesso à conta" className="hidden h-5 items-center justify-center gap-2 md:flex">
            <button type="button" onClick={() => openAuth('login', redirect)} aria-current={!isRegister ? 'page' : undefined} className={tabClass(!isRegister)}>Entrar</button>
            <span aria-hidden="true" className="h-5 w-px bg-[#f0805f]" />
            <button type="button" onClick={() => openAuth('register', redirect)} aria-current={isRegister ? 'page' : undefined} className={tabClass(isRegister)}>Criar conta</button>
          </nav>
          {isRegister && <p className="mt-10 hidden h-8 w-[min(404px,calc(100%-32px))] text-center text-[13px] leading-4 text-[#f5f1eb] md:block">Crie seu perfil de colecionador e conecte uma carteira quando quiser.</p>}
        </header>

        <h1 id="auth-dialog-title" className="sr-only">{isRegister ? 'Criar perfil de colecionador' : 'Entrar'}</h1>
        <p aria-hidden="true" className={`hidden h-4 shrink-0 items-center justify-center whitespace-nowrap text-center font-bold leading-4 text-[#f5f1eb] max-md:flex ${isRegister ? 'text-[18px]' : 'text-xl'}`}>{isRegister ? 'Criar perfil de colecionador' : 'Entrar'}</p>

        <form id="auth-form" className={`flex shrink-0 flex-col items-center gap-3 px-4 pt-6 md:px-10 max-md:w-full max-md:px-0 max-md:pt-0 ${isRegister ? 'md:min-h-[220px]' : 'md:min-h-[116px]'}`} onSubmit={(event) => void onSubmit(event)} noValidate>
          {isRegister && <div className="w-full md:max-w-[340px]"><label className={labelClass} htmlFor="auth-name">Nome de usuário</label><input id="auth-name" name="name" placeholder="Nome de usuário" autoComplete="name" required maxLength={80} className={`${fieldClass} max-md:text-center`} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'auth-name-error' : undefined} />{errors.name && <p id="auth-name-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.name}</p>}</div>}
          <div className="w-full md:max-w-[340px]"><label className={labelClass} htmlFor="auth-email">E-mail</label><input id="auth-email" name="email" type="email" placeholder="Digite seu e-mail" autoComplete="email" required className={fieldClass} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'auth-email-error' : undefined} />{errors.email && <p id="auth-email-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.email}</p>}</div>
          <div className="relative w-full md:max-w-[340px]"><label className={labelClass} htmlFor="auth-password">Senha</label><input id="auth-password" name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Senha" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} className={`${fieldClass} pr-11 ${!isRegister ? 'max-md:border-[#d28a4c]' : ''}`} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'auth-password-error' : undefined} /><button type="button" aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-2 top-1/2 mt-[-2px] inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#55321f] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">{passwordVisible ? <Eye size={18} strokeWidth={1.5} aria-hidden="true" /> : <EyeOff size={18} strokeWidth={1.5} aria-hidden="true" />}</button>{errors.password && <p id="auth-password-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.password}</p>}</div>
          {isRegister && <div className="relative w-full md:max-w-[340px]"><label className={labelClass} htmlFor="auth-confirm-password">Confirmar senha</label><input id="auth-confirm-password" name="confirmPassword" type={passwordVisible ? 'text' : 'password'} placeholder="Confirmar senha" autoComplete="new-password" required minLength={8} className={`${fieldClass} pr-11`} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'auth-confirm-password-error' : undefined} /><button type="button" aria-label={passwordVisible ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-2 top-1/2 mt-[-2px] inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#55321f] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">{passwordVisible ? <Eye size={18} strokeWidth={1.5} aria-hidden="true" /> : <EyeOff size={18} strokeWidth={1.5} aria-hidden="true" />}</button>{errors.confirmPassword && <p id="auth-confirm-password-error" className="mt-1 text-[11px] text-[#f1a28a]">{errors.confirmPassword}</p>}</div>}
          {!isRegister && <button type="button" onClick={() => setResetNotice('A recuperação de senha não está disponível nesta demonstração.')} className="hidden h-4 w-full cursor-pointer justify-end text-sm leading-4 text-[#e89b55] hover:text-[#f5b777] focus-visible:outline-2 focus-visible:outline-[#d28a4c] max-md:flex">Esqueceu a senha?</button>}
          {resetNotice && <p role="status" className="w-full text-xs text-[#cfb28c] max-md:text-center">{resetNotice}</p>}
          {requestError && <p role="alert" className="w-full rounded border border-[#9d5947] bg-[#46251f] px-3 py-2 text-xs text-[#ffd5c6] md:max-w-[340px]">{authError(requestError)}</p>}
        </form>

        <section aria-label="Enviar formulário" className="flex h-[69px] shrink-0 flex-col items-center px-4 pt-6 md:px-10 max-md:h-[60px] max-md:w-full max-md:px-0 max-md:pt-0">
          <Button type="submit" form="auth-form" disabled={busy} className="h-[45px] w-full text-base font-bold md:max-w-[340px] md:rounded-[5px] max-md:h-[60px] max-md:rounded-[10px]">{busy ? 'Aguarde…' : <><span className="md:hidden">{isRegister ? 'Criar perfil' : 'Entrar'}</span><span className="max-md:hidden">{isRegister ? 'Criar conta' : 'Entrar'}</span></>}</Button>
        </section>

        <section aria-label="Outras opções de acesso" className="flex h-[152px] shrink-0 flex-col gap-4 pt-6 max-md:h-[124px] max-md:w-full max-md:gap-3 max-md:pt-0">
          <div className="flex h-4 w-full items-center gap-3 text-[13px] leading-4 text-[#f5f1eb]">
            <span aria-hidden="true" className="h-px flex-1 bg-[#3f2319]" />
            <span className="shrink-0">Ou continue com</span>
            <span aria-hidden="true" className="h-px flex-1 bg-[#3f2319]" />
          </div>
          <SocialButtons />
        </section>

        <div className="flex h-5 shrink-0 items-center justify-center text-[15px] leading-5 text-[#cfb28c] md:hidden">
          {isRegister ? <>Já tem uma conta? <button type="button" onClick={() => openAuth('login', redirect)} className="ml-1 cursor-pointer text-[#cfb28c] hover:text-[#e89b55]">Entre</button></> : <>Novo na Kurio? <button type="button" onClick={() => openAuth('register', redirect)} className="ml-1 cursor-pointer text-[#cfb28c] hover:text-[#e89b55]">Crie uma conta</button></>}
        </div>
        {/* no mobile o modal ocupa a tela e não há esc: o voltar das outras telas faz o papel do "×" */}
        <button type="button" aria-label="Voltar" onClick={close} className="absolute left-7 top-8 inline-flex size-[35px] cursor-pointer items-center justify-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-[#b39463] transition-colors hover:border-[#d28a4c] hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] md:hidden"><ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" /></button>
        <button type="button" aria-label="Fechar" onClick={close} className="absolute right-4 top-4 hidden size-6 cursor-pointer items-center justify-center text-[#d28a4c] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] md:inline-flex"><X size={20} strokeWidth={1.5} /></button>
        <div aria-hidden="true" className="absolute bottom-0 left-0 hidden w-full bg-[#d28a4c] md:block" style={{ height: 10 }} />
      </div>
    </dialog>
  )
}
