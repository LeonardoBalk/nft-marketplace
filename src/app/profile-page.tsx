import { isAxiosError } from 'axios'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Eye, EyeOff, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountShell } from './account-shell'
import { passwordChangeSchema, profileSchema } from '../features/account/contracts'
import { useChangePassword, useProfile, useUpdateAvatar, useUpdateProfile } from '../features/account/queries'
import { ensSuffixes } from '../features/cart/contracts'

const avatarMaxBytes = 300_000

function fieldErrors(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object' || !('issues' in error)) return {}
  const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues
  const result: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    result[key] ??= issue.message
  }
  return result
}

function requestError(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback
}

function PasswordInput({ id, name, label, error }: { id: string; name: string; label: string; error?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex max-w-[417px] flex-col gap-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete="off" aria-invalid={Boolean(error)} className="pr-11" />
        <button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-3 top-2.5 cursor-pointer text-[#b39463] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">
          {visible ? <EyeOff size={20} strokeWidth={1.6} /> : <Eye size={20} strokeWidth={1.6} />}
        </button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-[#ffb59c]">{error}</p>}
    </div>
  )
}

function ProfileForm() {
  const profile = useProfile()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const changePassword = useChangePassword()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [avatarError, setAvatarError] = useState('')
  const [saved, setSaved] = useState(false)

  if (profile.isPending) {
    return <div className="flex flex-col gap-6" role="status" aria-label="Carregando perfil">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[79px] w-full max-w-[417px]" />)}</div>
    </div>
  }

  if (profile.isError) {
    return <p role="alert" className="text-sm text-[#ffb59c]">{requestError(profile.error, 'Não foi possível carregar seu perfil.')}</p>
  }

  const data = profile.data

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setSaved(false)
    const raw = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    updateProfile.mutate(parsed.data, { onSuccess: () => setSaved(true) })
  }

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordErrors({})
    const raw = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = passwordChangeSchema.safeParse(raw)
    if (!parsed.success) {
      setPasswordErrors(fieldErrors(parsed.error))
      return
    }
    const form = event.currentTarget
    changePassword.mutate(parsed.data, { onSuccess: () => form.reset() })
  }

  const pickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > avatarMaxBytes) {
      setAvatarError('A imagem deve ter no máximo 300 KB.')
      return
    }
    setAvatarError('')
    const reader = new FileReader()
    reader.onload = () => updateAvatar.mutate(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="profile-title" className="flex flex-col gap-6">
        <h1 id="profile-title" className="text-base font-bold leading-4">Perfil do colecionador</h1>
        <form id="profile-form" noValidate onSubmit={submitProfile} className="grid gap-6 lg:grid-cols-2">
          <div className="flex max-w-[417px] flex-col gap-[10px]">
            <Label htmlFor="displayName" className="h-[29px]">Nome de exibição<span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span></Label>
            <Input id="displayName" name="displayName" defaultValue={data.displayName} maxLength={80} aria-invalid={Boolean(errors.displayName)} />
            {errors.displayName && <p id="displayName-error" role="alert" className="text-xs text-[#ffb59c]">{errors.displayName}</p>}
          </div>
          <div className="flex max-w-[417px] flex-col gap-[10px]">
            <Label htmlFor="username" className="h-[29px]">Nome de usuário<span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span></Label>
            <Input id="username" name="username" defaultValue={data.username} maxLength={80} aria-invalid={Boolean(errors.username)} />
            {errors.username && <p id="username-error" role="alert" className="text-xs text-[#ffb59c]">{errors.username}</p>}
          </div>
          <div className="flex max-w-[417px] flex-col gap-[10px]">
            <Label htmlFor="profile-email" className="h-[29px]">E-mail<span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span></Label>
            <Input id="profile-email" name="email" type="email" defaultValue={data.email} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p id="profile-email-error" role="alert" className="text-xs text-[#ffb59c]">{errors.email}</p>}
          </div>
          <div className="flex max-w-[417px] flex-col gap-[10px]">
            <Label htmlFor="ensName" className="h-[29px]">Nome ENS<span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span></Label>
            <div className="flex gap-[10px]">
              <div className="w-[78px] shrink-0">
                <Select name="ensSuffix" defaultValue={data.ensSuffix}>
                  <SelectTrigger id="ensSuffix" aria-label="Sufixo ENS"><SelectValue /></SelectTrigger>
                  <SelectContent>{ensSuffixes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input id="ensName" name="ensName" defaultValue={data.ensName} maxLength={60} />
            </div>
          </div>
          <div className="flex max-w-[417px] flex-col gap-[10px]">
            <Label htmlFor="walletNickname" className="h-[29px]">Apelido da carteira<span aria-hidden="true" className="text-[22px] leading-7 text-[#f0805f]">*</span></Label>
            <Input id="walletNickname" name="walletNickname" defaultValue={data.walletNickname} maxLength={60} aria-invalid={Boolean(errors.walletNickname)} />
            {errors.walletNickname && <p id="walletNickname-error" role="alert" className="text-xs text-[#ffb59c]">{errors.walletNickname}</p>}
          </div>
          <div className="flex flex-col gap-[10px]">
            <span className="flex h-[29px] items-center text-[15px] leading-4">Avatar</span>
            <div className="flex items-center gap-6">
              <span className="flex size-[50px] items-center justify-center overflow-hidden rounded-full border border-[#3f2319] bg-[#2f1d15]">
                {data.avatarUrl
                  ? <img src={data.avatarUrl} alt="Seu avatar" width="50" height="50" className="size-full object-cover" />
                  : <ImageIcon size={24} strokeWidth={1.5} className="text-[#d28a4c]" aria-hidden="true" />}
              </span>
              <div className="flex items-center gap-5">
                <input ref={avatarInputRef} id="avatar" type="file" accept="image/*" onChange={pickAvatar} className="sr-only" />
                <Button type="button" disabled={updateAvatar.isPending} onClick={() => avatarInputRef.current?.click()} className="h-10 w-[98px] min-h-0 rounded-[3px] text-sm font-bold">Alterar</Button>
                <button type="button" disabled={updateAvatar.isPending || !data.avatarUrl} onClick={() => updateAvatar.mutate(null)} className="cursor-pointer border-0 bg-transparent text-sm leading-4 text-[#f5f1eb] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c] disabled:cursor-not-allowed disabled:opacity-50">Remover</button>
              </div>
            </div>
            {(avatarError || updateAvatar.isError) && <p role="alert" className="text-xs text-[#ffb59c]">{avatarError || requestError(updateAvatar.error, 'Não foi possível atualizar o avatar.')}</p>}
          </div>
        </form>
      </section>

      <section aria-labelledby="password-title" className="flex flex-col gap-6">
        <h2 id="password-title" className="text-base font-medium leading-4">Alterar senha</h2>
        <form id="password-form" noValidate onSubmit={submitPassword} className="flex flex-col gap-6">
          <PasswordInput id="currentPassword" name="currentPassword" label="Senha atual" error={passwordErrors.currentPassword} />
          <PasswordInput id="newPassword" name="newPassword" label="Nova senha" error={passwordErrors.newPassword} />
          <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirmar nova senha" error={passwordErrors.confirmPassword} />
          {changePassword.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(changePassword.error, 'Não foi possível alterar a senha.')}</p>}
          {changePassword.isSuccess && <p role="status" className="text-xs text-[#e89b55]">Senha alterada.</p>}
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-4 pb-12">
        <Button type="submit" form="profile-form" disabled={updateProfile.isPending} className="h-10 w-[131px] min-h-0 rounded-[3px] text-sm font-bold">{updateProfile.isPending ? 'Salvando…' : 'Salvar'}</Button>
        <Button type="submit" form="password-form" variant="outline" disabled={changePassword.isPending} className="h-10 min-h-0 rounded-[3px] border-[#d28a4c] px-5 text-sm font-bold text-[#e89b55]">{changePassword.isPending ? 'Alterando…' : 'Alterar senha'}</Button>
        {updateProfile.isError && <p role="alert" className="text-xs text-[#ffb59c]">{requestError(updateProfile.error, 'Não foi possível salvar o perfil.')}</p>}
        {saved && <p role="status" className="text-xs text-[#e89b55]">Perfil salvo.</p>}
      </div>
    </div>
  )
}

export function ProfilePage() {
  return <AccountShell active="profile" redirect="/perfil"><ProfileForm /></AccountShell>
}
