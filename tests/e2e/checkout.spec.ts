import { expect, test } from '@playwright/test'

async function fillCollectorProfile(page: import('@playwright/test').Page) {
  await page.locator('#displayName').fill('Leonardo Balk')
  await page.locator('#username').fill('leobalk')
  await page.locator('#network').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.locator('#profileName').fill('Coleção Kurio')
  await page.locator('#walletAddress').fill(`0x${'a1b2c3d4e5'.repeat(4)}`)
  await page.locator('#walletType').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await page.locator('#referralCode').fill('KURIO-LEO')
  await page.locator('#email').fill('colecionador@example.com')
}

test('carrinho de visitante sobrevive ao cadastro e fecha a compra', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: '1/10', exact: true }).click()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('2')

  await page.locator('header a[href="/carrinho"]').click()
  await expect(page).toHaveURL(/\/carrinho$/)

  // sem sessao a autenticacao retoma checkout
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Criar conta' }).first().click()
  await page.locator('#auth-name').fill('Leonardo Balk')
  await page.locator('#auth-email').fill('novo-colecionador@example.com')
  await page.locator('#auth-password').fill('senha-forte-1')
  await page.locator('#auth-confirm-password').fill('senha-forte-1')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()

  // carrinho visitante mesclado na conta criada
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.locator('#order-title + div')).toContainText('Subtotal')
  await expect(page.getByText('(x 2)')).toBeVisible()

  await fillCollectorProfile(page)
  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletOutcome: 'refused' }),
    })
  })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'A conexão foi recusada na carteira.' })).toBeVisible()
  await expect(page).toHaveURL(/\/checkout$/)

  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletOutcome: 'connected', walletDisconnectDuringCheckout: true }),
    })
  })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'A conexão com a carteira foi interrompida.' })).toBeVisible()
  await expect(page).toHaveURL(/\/checkout$/)

  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletDisconnectDuringCheckout: false }),
    })
  })
  let orderRequests = 0
  page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') orderRequests += 1 })
  await page.getByRole('button', { name: 'Confirmar compra' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })

  // confirmação é página própria, com o snapshot do pedido e recuperável após refresh
  await expect(page).toHaveURL(/\/pedido\/[^/]+$/)
  const receipt = page.getByRole('main')
  await expect(receipt.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  expect(orderRequests).toBe(1)
  await expect(receipt.getByText('ID da transação')).toBeVisible()
  await expect(receipt.getByText('(x 2)')).toBeVisible()
  await expect(receipt.getByText(/Edi\u00e7\u00e3o: 1\/10/)).toBeVisible()
  const stock = await page.evaluate(async () => (await (await fetch('/api/nfts/emerald-ape-042')).json()).editionAvailability)
  expect(stock['1/10']).toBe(8)
  expect(stock['1/1']).toBe(1)
  await expect(receipt.getByText('MetaMask')).toBeVisible()
  await page.reload()
  await expect(receipt.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(receipt.getByText('(x 2)')).toBeVisible()

  await receipt.getByRole('button', { name: 'Ver no Etherscan' }).click()
  await expect(receipt.getByText(/Transação simulada/)).toBeVisible()
  await receipt.getByRole('button', { name: 'Fechar' }).click()
  await expect(page).toHaveURL(/\/\?/)
})

test('checkout valida o perfil e aplica cupom', async ({ page }) => {
  await page.goto('/nft/golden-beat-207')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.goto('/checkout')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#auth-email').fill('test@kurio.test')
  await page.locator('#auth-password').fill('Kurio@2026')
  await page.locator('button[form="auth-form"]').click()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.locator('#displayName').fill('')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.getByRole('button', { name: 'Tem um código promocional? Aplique aqui' }).click()
  await page.locator('#coupon').fill('INVALIDO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom inválido.')).toBeVisible()

  await page.locator('#coupon').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()
  await expect(page.getByText('(-) 0.099')).toBeVisible()
})

test('a edição escolhida limita a quantidade adicionada', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('status', { name: 'Quantidade' })).toHaveText('3')

  await page.getByRole('button', { name: '1/1', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Quantidade' })).toHaveText('1')
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  await expect(page.getByText('1 disponível na edição 1/1.')).toBeVisible()

  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByRole('status', { name: 'Quantidade de Emerald Ape #042' })).toHaveText('1')
  await expect(page.locator('header a[href="/carrinho"]')).toHaveText('1')
})
