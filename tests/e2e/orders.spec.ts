import { expect, test } from '@playwright/test'

async function signUp(page: import('@playwright/test').Page, email: string) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // desktop tem a aba "Criar conta"; no mobile o modal leva o link "Crie uma conta"
  await dialog.getByRole('button', { name: /^(Criar conta|Crie uma conta)$/ }).first().click()
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

async function createOrderFromCart(page: import('@playwright/test').Page, email: string, key: string, scenario: Record<string, unknown>) {
  return page.evaluate(async ({ email, key, scenario }) => {
    const token = localStorage.getItem('kurio.demo.access-token.v1') ?? ''
    const guestId = localStorage.getItem('kurio.demo.guest-id.v1') ?? ''
    await fetch('/api/demo/scenario', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(scenario) })
    const connectionResponse = await fetch('/api/wallet/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-guest-id': guestId },
      body: JSON.stringify({ provider: 'coinbase' }),
    })
    const connection = await connectionResponse.json() as { connectionId?: string }
    const cartResponse = await fetch('/api/cart', { headers: { authorization: `Bearer ${token}`, 'x-guest-id': guestId } })
    const cart = await cartResponse.json() as {
      itemCount: number; subtotalEth: string; discountEth: string; networkFeeEth: string; totalEth: string; couponCode: string | null
      items: Array<{ nft: { id: string; priceEth: string; available: number; version: number; editionAvailability: Record<string, number> }; edition: string; quantity: number }>
    }
    const quote = [cart.itemCount, cart.subtotalEth, cart.discountEth, cart.networkFeeEth, cart.totalEth, cart.couponCode ?? '', ...cart.items.map(({ nft, edition, quantity }) => [nft.id, edition, quantity, nft.priceEth, nft.available, nft.editionAvailability[edition], nft.version].join(':'))].join('|')
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-guest-id': guestId,
        'idempotency-key': key,
        'x-expected-quote': quote,
        'x-wallet-connection': connection.connectionId ?? '',
      },
      body: JSON.stringify({
        displayName: 'Leonardo Balk',
        username: 'leobalk',
        network: 'ethereum',
        profileName: 'Coleção Kurio',
        walletAddress: `0x${'a1b2c3d4e5'.repeat(4)}`,
        secondaryWallet: '',
        walletType: 'metamask',
        referralCode: 'KURIO-LEO',
        email,
        ensSuffix: '.eth',
        useOtherWallet: false,
        note: '',
        walletProvider: 'coinbase',
      }),
    })
    return { status: response.status, body: await response.json() as { orderId?: string; status?: string; code?: string } }
  }, { email, key, scenario })
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
    const guestId = localStorage.getItem('kurio.demo.guest-id.v1') ?? ''
    await fetch('/api/demo/scenario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settlementDelayMs: 5000 }),
    })
    const connectionResponse = await fetch('/api/wallet/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-guest-id': guestId },
      body: JSON.stringify({ provider: 'coinbase' }),
    })
    const connection = await connectionResponse.json() as { connectionId?: string }
    const cartResponse = await fetch('/api/cart', { headers: { authorization: `Bearer ${token}`, 'x-guest-id': guestId } })
    const cart = await cartResponse.json() as {
      itemCount: number; subtotalEth: string; discountEth: string; networkFeeEth: string; totalEth: string; couponCode: string | null
      items: Array<{ nft: { id: string; priceEth: string; available: number; version: number; editionAvailability: Record<string, number> }; edition: string; quantity: number }>
    }
    const quote = [cart.itemCount, cart.subtotalEth, cart.discountEth, cart.networkFeeEth, cart.totalEth, cart.couponCode ?? '', ...cart.items.map(({ nft, edition, quantity }) => [nft.id, edition, quantity, nft.priceEth, nft.available, nft.editionAvailability[edition], nft.version].join(':'))].join('|')
    const send = async (key: string, payload: unknown) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-guest-id': localStorage.getItem('kurio.demo.guest-id.v1') ?? '',
          'idempotency-key': key,
          'x-expected-quote': quote,
          'x-wallet-connection': connection.connectionId ?? '',
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

    expect(result.first.status).toBe(202)
  expect(result.replay.status).toBe(200)
  expect(result.replay.body.orderId).toBe(result.first.body.orderId)
  expect(result.conflict.status).toBe(409)
  expect(result.conflict.body.code).toBe('IDEMPOTENCY_CONFLICT')
})

test('recusa de pagamento mantém os itens no carrinho', async ({ page }) => {
  const email = 'recusa-e2e@example.com'
  await addToCart(page, 'cosmic-bloom-118')
  await page.goto('/entrar')
  await signUp(page, email)

  const created = await createOrderFromCart(page, email, 'pagamento-recusado-e2e', { paymentOutcome: 'declined', settlementDelayMs: 50 })
  expect(created.status).toBe(202)
  await expect.poll(async () => page.evaluate(async (orderId) => {
    const token = localStorage.getItem('kurio.demo.access-token.v1') ?? ''
    const response = await fetch(`/api/orders/${orderId}`, { headers: { authorization: `Bearer ${token}` } })
    return (await response.json() as { status?: string }).status
  }, created.body.orderId)).toBe('declined')
  const cart = await page.evaluate(async () => {
    const response = await fetch('/api/cart', { headers: { authorization: `Bearer ${localStorage.getItem('kurio.demo.access-token.v1') ?? ''}`, 'x-guest-id': localStorage.getItem('kurio.demo.guest-id.v1') ?? '' } })
    return await response.json() as { itemCount: number }
  })
  expect(cart.itemCount).toBe(1)
})

test('timeout após criar pedido recupera a mesma tentativa pela chave idempotente', async ({ page }) => {
  const email = 'timeout-order-e2e@example.com'
  await addToCart(page, 'golden-beat-207')
  await page.goto('/entrar')
  await signUp(page, email)

  const first = await createOrderFromCart(page, email, 'timeout-recuperavel-e2e', { timeoutAfterOrderCreation: true, settlementDelayMs: 5000 })
  const retry = await createOrderFromCart(page, email, 'timeout-recuperavel-e2e', { timeoutAfterOrderCreation: false, settlementDelayMs: 5000 })
  expect(first.status).toBe(504)
  expect(first.body.code).toBe('RESPONSE_LOST')
  expect(retry.status).toBe(200)
  expect(retry.body.status).toBe('pending')
  expect(retry.body.orderId).toBeTruthy()
})

test('estoque alterado durante o checkout bloqueia a criação do pedido', async ({ page }) => {
  const email = 'estoque-alterado-e2e@example.com'
  await addToCart(page, 'cosmic-bloom-118')
  await page.goto('/entrar')
  await signUp(page, email)
  await page.goto('/checkout')
  await expect(page.getByText('1.29 ETH').first()).toBeVisible()

  await page.evaluate(async () => {
    await fetch('/api/demo/nfts/cosmic-bloom-118/availability', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ available: 0 }),
    })
  })
  await expect(page.getByRole('alert').filter({ hasText: 'Os valores mudaram' })).toBeVisible()

  const result = await createOrderFromCart(page, email, 'estoque-esgotado-e2e', {})
  expect(result.status).toBe(409)
  expect(result.body.code).toBe('OUT_OF_STOCK')
})

test('eventos duplicados e antigos não regridem o estado terminal do pedido', async ({ page }) => {
  const email = 'eventos-pedido-e2e@example.com'
  await addToCart(page, 'golden-beat-207')
  await page.goto('/entrar')
  await signUp(page, email)

  const created = await createOrderFromCart(page, email, 'eventos-fora-de-ordem-e2e', {
    settlementDelayMs: 1500,
    duplicateOrderEvents: true,
    staleOrderEvent: true,
  })
  expect(created.status).toBe(202)
  await page.goto(`/pedido/${created.body.orderId}`)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toHaveCount(0)
})

test('sessão expirada abre autenticação e preserva a rota que o usuário estava acessando', async ({ page }) => {
  await page.goto('/perfil')
  await signUp(page, 'sessao-expirada-e2e@example.com')
  await page.evaluate(async () => {
    await fetch('/api/demo/session/expire', {
      method: 'POST',
      headers: { authorization: `Bearer ${localStorage.getItem('kurio.demo.access-token.v1') ?? ''}` },
    })
  })
  await page.reload()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect.poll(() => decodeURIComponent(page.url())).toMatch(/(?:\/perfil$|redirect=\/perfil)/)
})

test('pedido pendente recupera status após refresh mesmo quando os eventos foram interrompidos', async ({ page }) => {
  const email = 'pedido-reconectado-e2e@example.com'
  await addToCart(page, 'violet-nomad-314')
  await page.goto('/entrar')
  await signUp(page, email)

  const created = await createOrderFromCart(page, email, 'pedido-reconectado-e2e', { settlementDelayMs: 1200, dropOrderEvents: true })
  expect(created.status).toBe(202)
  await page.goto(`/pedido/${created.body.orderId}`)
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
})

test.describe('pagamento no mobile', () => {
  test.use({ viewport: { width: 414, height: 896 } })

  test('paga com a carteira salva e o provedor escolhido, sem formulário', async ({ page }) => {
    await page.goto('/carteiras')
    await signUp(page, 'pagamento-mobile-e2e@example.com')
    await page.locator('#primary-displayName').fill('Leonardo Balk')
    await page.locator('#primary-nickname').fill('Principal')
    await page.locator('#primary-network').click()
    await page.getByRole('option', { name: 'Ethereum' }).click()
    await page.locator('#primary-profileName').fill('Coleção Kurio')
    await page.locator('#primary-address').fill(`0x${'a91f0e82c1'.repeat(4)}`)
    await page.locator('#primary-type').click()
    await page.getByRole('option', { name: 'MetaMask' }).click()
    await page.locator('#primary-referralCode').fill('KURIO-LEO')
    await page.locator('#primary-email').fill('pagamento-mobile-e2e@example.com')
    await page.getByRole('button', { name: 'Salvar carteira' }).first().click()
    await expect(page.getByText('Carteira salva.')).toBeVisible()

    await page.goto('/nft/golden-beat-207')
    await page.getByRole('button', { name: 'Comprar NFT' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await page.goto('/checkout')

    await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegação' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: /Principal/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'Coinbase Wallet' })).toBeChecked()

    await page.getByRole('radio', { name: 'Coinbase Wallet' }).focus()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('radio', { name: 'MetaMask' })).toBeChecked()

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedido\/[^/]+$/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await expect(page.getByText('Coinbase Wallet')).toHaveCount(0)
    await expect(page.getByText('MetaMask')).toBeVisible()
  })
})

test('pedido pendente se recupera apos interrupcao e reconexao real do socket', async ({ page }) => {
  const email = 'reconexao-real@example.com'
  await addToCart(page, 'violet-nomad-314')
  await page.goto('/entrar')
  await signUp(page, email)
  const created = await createOrderFromCart(page, email, 'socket-reconnect-e2e', { settlementDelayMs: 4000, dropOrderEvents: true })
  expect(created.status).toBe(202)
  await page.goto(`/pedido/${created.body.orderId}`)
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
  await expect.poll(async () => page.evaluate(async () => (await (await fetch('/api/demo/socket')).json()).connections)).toBeGreaterThan(0)
  const opened = await page.evaluate(async () => (await (await fetch('/api/demo/socket')).json()).opened)
  const result = await page.evaluate(async () => (await (await fetch('/api/demo/socket/disconnect', { method: 'POST' })).json()).disconnected)
  expect(result).toBeGreaterThan(0)
  await expect.poll(async () => page.evaluate(async () => (await (await fetch('/api/demo/socket')).json()).opened), { timeout: 15000 }).toBeGreaterThan(opened)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15000 })
  await expect(page).toHaveURL(new RegExp(`/pedido/${created.body.orderId}$`))
})

test('evento de pedido da sessao anterior nao consulta nem exibe dados de outra conta', async ({ page }) => {
  const firstEmail = 'sessao-antiga@example.com'
  await addToCart(page, 'violet-nomad-314')
  await page.goto('/entrar')
  await signUp(page, firstEmail)
  const created = await createOrderFromCart(page, firstEmail, 'evento-sessao-anterior', { settlementDelayMs: 12000 })
  expect(created.status).toBe(202)
  await page.goto(`/pedido/${created.body.orderId}`)
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Menu da conta de Leonardo Balk' }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await signUp(page, 'sessao-nova@example.com')
  await expect.poll(async () => page.evaluate(async () => (await (await fetch('/api/demo/socket')).json()).connections)).toBeGreaterThan(0)
  let oldOrderRequests = 0
  page.on('request', (request) => { if (new URL(request.url()).pathname === `/api/orders/${created.body.orderId}`) oldOrderRequests++ })
  await page.evaluate(async (orderId) => {
    await fetch(`/api/demo/orders/${orderId}/event`, { method: 'POST' })
    await fetch('/api/demo/nfts/emerald-ape-042/price', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ priceEth: '1.29' }) })
  }, created.body.orderId)
  await expect(page.locator('#catalogo a[href="/nft/emerald-ape-042"]').getByText('1.29 ETH')).toBeVisible()
  expect(oldOrderRequests).toBe(0)
  await page.goto(`/pedido/${created.body.orderId}`)
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
})
