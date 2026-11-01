import { expect, test } from '@playwright/test'

test('carrinho altera quantidade, remove item e sobrevive ao refresh', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.goto('/nft/violet-nomad-314')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)

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
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.goto('/carrinho')

  await page.getByLabel('Código promocional').fill('EXPIRADO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este cupom expirou.')).toBeVisible()

  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()
  await expect(page.getByText('(-) 0.099')).toBeVisible()
})

test('conectar e finalizar pede login quando o visitante não tem sessão', async ({ page }) => {
  await page.goto('/nft/cosmic-bloom-118')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
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

test.describe('carrinho no mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('cards do frame: menos desabilitado em 1, mais soma, lixeira remove e finalizar pede login', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByText('adicionado ao carrinho.')).toBeVisible()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await page.goto('/carrinho')

    await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegação' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' })).toBeDisabled()

    await page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }).click()
    await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('2')
    await expect(page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' })).toBeEnabled()

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })
})

test('carrinho de visitante soma ao carrinho que a conta já tinha ao fazer login', async ({ page }) => {
  const addToCart = async (nftId: string) => {
    await page.goto(`/nft/${nftId}`)
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
  }
  const dialog = page.getByRole('dialog')

  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await dialog.getByRole('button', { name: 'Criar conta' }).first().click()
  await page.locator('#auth-name').fill('Conta com carrinho')
  await page.locator('#auth-email').fill('carrinho-merge-e2e@example.com')
  await page.locator('#auth-password').fill('senha-forte-1')
  await page.locator('#auth-confirm-password').fill('senha-forte-1')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()
  await addToCart('emerald-ape-042')

  await page.getByRole('button', { name: /^Menu da conta/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

  await addToCart('emerald-ape-042')
  await addToCart('golden-beat-207')

  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.locator('#auth-email').fill('carrinho-merge-e2e@example.com')
  await page.locator('#auth-password').fill('senha-forte-1')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()

  await page.goto('/carrinho')
  await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('2')
  await expect(page.getByRole('status', { name: 'Quantidade de Golden Beat #207' })).toHaveText('1')
  await page.reload()
  await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('2')
})

test('edições distintas persistem e respeitam seus limites no carrinho', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: '1/1', exact: true }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText(/Edi\u00e7\u00e3o: 1\/1$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' })).toBeDisabled()
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: '1/10', exact: true }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText(/Edi\u00e7\u00e3o: 1\/1$/)).toBeVisible()
  await expect(page.getByText('Edição: 1/10')).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Edi\u00e7\u00e3o: 1\/1$/)).toBeVisible()
  await expect(page.getByText('Edição: 1/10')).toBeVisible()
  const statuses = await page.evaluate(async () => {
    const guest = localStorage.getItem('kurio.demo.guest-id.v1') ?? ''
    const headers = { 'content-type': 'application/json', 'x-guest-id': guest }
    const add = await fetch('/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId: 'emerald-ape-042', edition: '1/1', quantity: 1 }) })
    const patch = await fetch('/api/cart/items/emerald-ape-042', { method: 'PATCH', headers, body: JSON.stringify({ edition: '1/1', quantity: 2 }) })
    return [add.status, patch.status]
  })
  expect(statuses).toEqual([409, 409])
})

test('cotação e apresentação preservam 18 casas decimais', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await expect(page.locator('html[data-mocks-ready="true"]')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.evaluate(async () => {
    await fetch('/api/demo/nfts/emerald-ape-042/price', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ priceEth: '0.000000000000000123' }) })
  })
  await page.reload()
  await expect(page.getByText('0.000000000000000123 ETH').first()).toBeVisible()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('0.000000000000000123 ETH').first()).toBeVisible()
  await expect(page.getByText('0.005000000000000123 ETH')).toBeVisible()
})
