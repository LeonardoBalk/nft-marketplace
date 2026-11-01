import { expect, test } from '@playwright/test'

async function register(page: import('@playwright/test').Page, email: string) {
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

async function addItem(page: import('@playwright/test').Page) {
  await page.goto('/nft/golden-beat-207')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

test('checkout recupera pela interface a resposta perdida sem duplicar pedido', async ({ page }) => {
  await addItem(page)
  await page.goto('/checkout')
  await register(page, 'recuperacao-pedido@example.com')
  await expect(page).toHaveURL(/\/checkout$/)
  await page.locator('#displayName').fill('Leonardo Balk')
  await page.locator('#username').fill('leobalk')
  await page.locator('#network').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.locator('#profileName').fill('Coleção Kurio')
  await page.locator('#walletAddress').fill(`0x${'a1b2c3d4e5'.repeat(4)}`)
  await page.locator('#walletType').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await page.locator('#referralCode').fill('KURIO-LEO')
  await page.locator('#email').fill('recuperacao-pedido@example.com')
  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timeoutAfterOrderCreation: true, settlementDelayMs: 1000 }) })
  })
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') keys.push(request.headers()['idempotency-key'])
  })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedido\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  expect(keys).toHaveLength(2)
  expect(keys[0]).toBe(keys[1])
})

test('falha ao mesclar carrinho é avisada e permite recuperar os itens', async ({ page }) => {
  await addItem(page)
  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nextFailure: { path: '/api/cart/merge', kind: 'http', status: 503, remaining: 2 } }) })
  })
  await page.goto('/checkout')
  await register(page, 'recuperacao-carrinho@example.com')
  const notice = page.getByRole('alert').filter({ hasText: 'itens do carrinho de visitante' })
  await expect(notice).toBeVisible()
  await expect(notice.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled()
  await notice.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(notice).toBeHidden()
  await expect(page.getByText('Golden Beat #207').first()).toBeVisible()
})

test('Comprar só fica visível quando o primeiro clique pode ser executado', async ({ page }) => {
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800))
    await route.continue()
  })
  await page.goto('/nft/golden-beat-207', { waitUntil: 'commit' })
  await expect(page.locator('html[data-hydrated="true"]')).toHaveCount(0)
  await expect(page.locator('button:has-text("COMPRAR")')).toHaveCount(1)
  await expect(page.locator('button:has-text("COMPRAR")')).toBeHidden()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
})
