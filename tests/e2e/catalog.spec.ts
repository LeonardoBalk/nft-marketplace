import { expect, test } from '@playwright/test'

test('busca e filtros combinados sobrevivem a refresh e histórico', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.getByLabel('Buscar NFTs').fill('Golden')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/q=Golden/)
  await expect(page.locator('#catalogo').getByText('Golden Beat #207')).toBeVisible()

  await page.getByRole('button', { name: 'Música' }).click()
  await expect(page).toHaveURL(/category=M%C3%BAsica/)
  await expect(page.locator('#catalogo ul').getByRole('link')).toHaveCount(1)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Música' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#catalogo').getByText('Golden Beat #207')).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('button', { name: 'Música' })).toHaveAttribute('aria-pressed', 'false')
})

test('ordenação e paginação mudam a consulta', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Ordenar por').selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(page.locator('#catalogo li').first()).toContainText('Golden Signal #160')
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('#catalogo li')).toHaveCount(3)
})

test('faixa de preço filtra sem perder precisão decimal', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preço mínimo em ETH').fill('1.50')
  await page.getByLabel('Preço máximo em ETH').fill('2.00')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page).toHaveURL(/minPrice=/)
  await expect(page.locator('#catalogo li')).toHaveCount(3)
  await expect(page.locator('#catalogo').getByText('Emerald Ape #042')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('#catalogo li')).toHaveCount(3)
})

test('detalhe abre diretamente e NFT inexistente mostra erro', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.goto('/nft/inexistente')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})
