import { expect, test } from '@playwright/test'

test('carrinho altera quantidade, remove item e sobrevive ao refresh', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await page.goto('/nft/violet-nomad-314')
  await page.getByRole('button', { name: 'COMPRAR' }).click()

  await page.goto('/carrinho')
  await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.locator('main ul li')).toHaveCount(2)

  await page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }).click()
  await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('2')
  await expect(page.getByText('2.38 ETH')).toBeVisible()
  await expect(page.locator('header a[href="/carrinho"]')).toHaveText('3')

  await page.reload()
  await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('2')

  await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).click()
  await expect(page.locator('main ul li')).toHaveCount(1)
  await expect(page.locator('header a[href="/carrinho"]')).toHaveText('2')

  await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
})

test('cupom expirado e inválido são tratados no carrinho', async ({ page }) => {
  await page.goto('/nft/golden-beat-207')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await page.goto('/carrinho')

  await page.getByLabel('Código promocional').fill('EXPIRADO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este cupom expirou.')).toBeVisible()

  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()
  await expect(page.getByText('(-) 0.10')).toBeVisible()
})

test('conectar e finalizar pede login quando o visitante não tem sessão', async ({ page }) => {
  await page.goto('/nft/cosmic-bloom-118')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await page.goto('/carrinho')

  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/\/carrinho$/)

  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.locator('header a[href="/carrinho"]')).toHaveText('1')
})
