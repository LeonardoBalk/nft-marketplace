import { expect, test } from '@playwright/test'

async function signUp(page: import('@playwright/test').Page, email: string) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Criar conta' }).first().click()
  await page.locator('#auth-name').fill('Leonardo Balk')
  await page.locator('#auth-email').fill(email)
  await page.locator('#auth-password').fill('senha-forte-1')
  await page.locator('#auth-confirm-password').fill('senha-forte-1')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()
}

test('perfil exige sessão, salva dados e valida a troca de senha', async ({ page }) => {
  await page.goto('/perfil')
  // visitante não vê os dados: o modal abre sozinho com retorno para /perfil
  await signUp(page, 'perfil-e2e@example.com')

  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(page.locator('#displayName')).toHaveValue('Leonardo Balk')

  await page.locator('#username').fill('leo-colecionador')
  await page.locator('#walletNickname').fill('Carteira fria')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Perfil salvo.')).toBeVisible()

  await page.reload()
  await expect(page.locator('#username')).toHaveValue('leo-colecionador')

  await page.locator('#displayName').fill('L')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()

  await page.locator('#currentPassword').fill('senha-errada-1')
  await page.locator('#newPassword').fill('nova-senha-123')
  await page.locator('#confirmPassword').fill('nova-senha-123')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('A senha atual não confere.')).toBeVisible()

  await page.locator('#currentPassword').fill('senha-forte-1')
  await page.locator('#newPassword').fill('nova-senha-123')
  await page.locator('#confirmPassword').fill('outra-senha-123')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('As senhas não conferem.')).toBeVisible()

  await page.locator('#confirmPassword').fill('nova-senha-123')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('Senha alterada.')).toBeVisible()
})

test('carteiras salvam, validam endereço e persistem após refresh', async ({ page }) => {
  await page.goto('/carteiras')
  await signUp(page, 'carteiras-e2e@example.com')

  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  await page.locator('#primary-displayName').fill('Leonardo Balk')
  await page.locator('#primary-nickname').fill('Carteira principal')
  await page.locator('#primary-network').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.locator('#primary-profileName').fill('Coleção Kurio')
  await page.locator('#primary-address').fill('0xzz')
  await page.locator('#primary-type').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await page.locator('#primary-referralCode').fill('KURIO-LEO')
  await page.locator('#primary-email').fill('carteiras-e2e@example.com')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Informe um endereço 0x com 40 caracteres.')).toBeVisible()

  await page.locator('#primary-address').fill(`0x${'a1b2c3d4e5'.repeat(4)}`)
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira salva.')).toBeVisible()

  await page.reload()
  await expect(page.locator('#primary-address')).toHaveValue(`0x${'a1b2c3d4e5'.repeat(4)}`)
  await expect(page.locator('#primary-nickname')).toHaveValue('Carteira principal')

  await page.getByRole('button', { name: 'Igual à carteira principal' }).click()
  await expect(page.locator('#secondary-address')).toHaveValue(`0x${'a1b2c3d4e5'.repeat(4)}`)
  await page.getByRole('button', { name: 'Remover carteira secundária' }).click()
  await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
})
