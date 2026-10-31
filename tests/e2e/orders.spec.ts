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

async function addToCart(page: import('@playwright/test').Page, nftId: string) {
  await page.goto(`/nft/${nftId}`)
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

test('rota privada sem sessão cai em /entrar e retoma o destino', async ({ page }) => {
  await page.goto('/carteiras')
  await expect(page).toHaveURL(/\/entrar\?.*redirect=/)
  await expect(page.getByRole('dialog')).toBeVisible()

  await signUp(page, 'portao-e2e@example.com')
  await expect(page).toHaveURL(/\/carteiras$/)
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
})

test('preço alterado durante o checkout exige nova confirmação', async ({ page }) => {
  await addToCart(page, 'violet-nomad-314')
  await page.goto('/entrar')
  await signUp(page, 'cotacao-e2e@example.com')

  await page.goto('/checkout')
  await expect(page.getByText('1.39 ETH').first()).toBeVisible()

  await page.evaluate(async () => {
    await fetch('/api/demo/nfts/violet-nomad-314/price', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceEth: '2.50' }),
    })
  })

  const warning = page.getByRole('alert').filter({ hasText: 'Os valores mudaram' })
  await expect(warning).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

  await warning.getByRole('button', { name: 'Revisar e continuar' }).click()
  await expect(warning).toBeHidden()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
})

test('a carteira cadastrada preenche o pagamento', async ({ page }) => {
  const address = `0x${'a1b2c3d4e5'.repeat(4)}`
  await page.goto('/carteiras')
  await signUp(page, 'carteira-checkout-e2e@example.com')

  await page.locator('#primary-displayName').fill('Leonardo Balk')
  await page.locator('#primary-nickname').fill('Carteira principal')
  await page.locator('#primary-network').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.locator('#primary-profileName').fill('Coleção Kurio')
  await page.locator('#primary-address').fill(address)
  await page.locator('#primary-type').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await page.locator('#primary-referralCode').fill('KURIO-LEO')
  await page.locator('#primary-email').fill('carteira-checkout-e2e@example.com')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira salva.')).toBeVisible()

  await addToCart(page, 'golden-beat-207')
  await page.goto('/checkout')
  await expect(page.locator('#walletAddress')).toHaveValue(address)
  await expect(page.locator('#profileName')).toHaveValue('Coleção Kurio')
  await expect(page.locator('#referralCode')).toHaveValue('KURIO-LEO')
})

test('a mesma chave de idempotência recupera o pedido em vez de duplicar', async ({ page }) => {
  await addToCart(page, 'cosmic-bloom-118')
  await page.goto('/entrar')
  await signUp(page, 'idempotencia-e2e@example.com')

  const result = await page.evaluate(async () => {
    const body = {
      displayName: 'Leonardo Balk',
      username: 'leobalk',
      network: 'ethereum',
      profileName: 'Coleção Kurio',
      walletAddress: `0x${'a1b2c3d4e5'.repeat(4)}`,
      secondaryWallet: '',
      walletType: 'metamask',
      referralCode: 'KURIO-LEO',
      email: 'idempotencia-e2e@example.com',
      ensSuffix: '.eth',
      useOtherWallet: false,
      note: '',
      walletProvider: 'coinbase',
    }
    const token = localStorage.getItem('kurio.demo.access-token.v1')
    const send = async (key: string, payload: unknown) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-guest-id': localStorage.getItem('kurio.demo.guest-id.v1') ?? '',
          'idempotency-key': key,
        },
        body: JSON.stringify(payload),
      })
      return { status: response.status, body: await response.json() as { orderId?: string; code?: string } }
    }

    const first = await send('chave-fixa-e2e', body)
    const replay = await send('chave-fixa-e2e', body)
    const conflict = await send('chave-fixa-e2e', { ...body, referralCode: 'OUTRO-CODIGO' })
    return { first, replay, conflict }
  })

  expect(result.first.status).toBe(201)
  expect(result.replay.status).toBe(200)
  expect(result.replay.body.orderId).toBe(result.first.body.orderId)
  expect(result.conflict.status).toBe(409)
  expect(result.conflict.body.code).toBe('IDEMPOTENCY_CONFLICT')
})
