import { expect, test, type Page } from '@playwright/test'

// relógio controlado: a espera vira um avanço explícito, sem sleeps nem timeouts longos

async function logIn(page: Page, email: string) {
  await page.getByRole('button', { name: 'Entrar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.locator('#auth-email').fill(email)
  await page.locator('#auth-password').fill('Kurio@2026')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()
}

// cria o pedido pelos handlers, com o mesmo contrato que a tela de pagamento envia
async function createOrder(page: Page, key: string, scenario: Record<string, unknown>) {
  return page.evaluate(async ({ key, scenario }) => {
    const token = localStorage.getItem('kurio.demo.access-token.v1') ?? ''
    const guestId = localStorage.getItem('kurio.demo.guest-id.v1') ?? ''
    const headers = { authorization: `Bearer ${token}`, 'x-guest-id': guestId }
    await fetch('/api/demo/scenario', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(scenario) })
    const connection = await (await fetch('/api/wallet/connect', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'coinbase' }) })).json() as { connectionId?: string }
    const cart = await (await fetch('/api/cart', { headers })).json() as {
      itemCount: number; subtotalEth: string; discountEth: string; networkFeeEth: string; totalEth: string; couponCode: string | null
      items: Array<{ nft: { id: string; priceEth: string; available: number; version: number; editionAvailability: Record<string, number> }; edition: string; quantity: number }>
    }
    const quote = [cart.itemCount, cart.subtotalEth, cart.discountEth, cart.networkFeeEth, cart.totalEth, cart.couponCode ?? '', ...cart.items.map(({ nft, edition, quantity }) => [nft.id, edition, quantity, nft.priceEth, nft.available, nft.editionAvailability[edition], nft.version].join(':'))].join('|')
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': key, 'x-expected-quote': quote, 'x-wallet-connection': connection.connectionId ?? '' },
      body: JSON.stringify({
        displayName: 'Test', username: 'test', network: 'ethereum', profileName: 'Coleção Kurio',
        walletAddress: `0x${'a1b2c3d4e5'.repeat(4)}`, secondaryWallet: '', walletType: 'metamask', referralCode: 'KURIO-TEST',
        email: 'test@kurio.test', ensSuffix: '.eth', useOtherWallet: false, note: '', walletProvider: 'coinbase',
      }),
    })
    return { status: response.status, body: await response.json() as { orderId?: string } }
  }, { key, scenario })
}

test('pedido pendente só liquida quando o relógio alcança o prazo da simulação', async ({ page }) => {
  await page.clock.install()
  await page.goto('/nft/violet-nomad-314')
  await logIn(page, 'test@kurio.test')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)

  const created = await createOrder(page, 'relogio-liquidacao-e2e', { settlementDelayMs: 60_000 })
  expect(created.status).toBe(202)
  await page.goto(`/pedido/${created.body.orderId}`)
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()

  // pausa depois que a página terminou de carregar para não bloquear o React.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
  // antes do prazo nada muda, nem com o polling rodando
  await page.clock.runFor(40_000)
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()

  await page.clock.runFor(25_000)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 3_000 })
})

test('sessão vence pelo tempo e a próxima chamada reabre o login', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  await logIn(page, 'test@kurio.test')
  const account = page.getByRole('button', { name: 'Menu da conta de Test' })
  await expect(account).toBeVisible()

  // o token da simulação vale 8 horas
  await page.clock.fastForward('08:00:01')
  await account.click()
  await page.getByRole('menuitem', { name: 'Dados do perfil' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' }).first()).toBeVisible()
  await expect(page).toHaveURL(/\/perfil$/)
})
