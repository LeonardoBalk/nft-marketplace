import { expect, test } from '@playwright/test'

test('favoritar exige sessão e persiste depois do refresh', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')

  // visitante não favorita: o modal abre e devolve para o detalhe
  const favorite = page.getByRole('button', { name: /Emerald Ape #042 (aos|dos) favoritos$/ })
  await favorite.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Criar conta' }).first().click()
  await page.locator('#auth-name').fill('Leonardo Balk')
  await page.locator('#auth-email').fill('favoritos-e2e@example.com')
  await page.locator('#auth-password').fill('senha-forte-1')
  await page.locator('#auth-confirm-password').fill('senha-forte-1')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()

  await expect(favorite).toHaveAttribute('aria-pressed', 'false')

  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(page.getByRole('button', { name: /Emerald Ape #042 (aos|dos) favoritos$/ })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /Emerald Ape #042 (aos|dos) favoritos$/ }).click()
  await expect(page.getByRole('button', { name: /Emerald Ape #042 (aos|dos) favoritos$/ })).toHaveAttribute('aria-pressed', 'false')
})
