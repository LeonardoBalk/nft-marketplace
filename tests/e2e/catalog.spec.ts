import { expect, test } from '@playwright/test'

test('busca e filtros combinados sobrevivem a refresh e histórico', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.getByLabel('Buscar NFTs').fill('Golden')
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
  await page.getByRole('combobox', { name: /Ordenar por/ }).click()
  await page.getByRole('option', { name: 'Menor preço' }).click()
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(page.locator('#catalogo li').first()).toContainText('Golden Signal #160')
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('#catalogo li')).toHaveCount(9)
})

test('faixa de preço filtra sem perder precisão decimal', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preço mínimo em ETH').fill('1.5')
  await page.getByLabel('Preço máximo em ETH').fill('2')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page).toHaveURL(/minPrice=%221\.50%22&maxPrice=%222\.00%22/)
  await expect(page.locator('#catalogo li')).toHaveCount(9)
  await expect(page.locator('#catalogo').getByText('Emerald Ape #042')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('#catalogo li')).toHaveCount(9)
})

test('loading lento mostra skeleton e falha HTTP permite tentar novamente', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html[data-mocks-ready="true"]')).toHaveCount(1)
  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latencyMs: 700 }),
    })
  })

  await page.goto('/nft/emerald-ape-043')
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #043' })).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('html[data-mocks-ready="true"]')).toHaveCount(1)

  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latencyMs: 0, nextFailure: { method: 'GET', path: '/api/nfts', kind: 'http', status: 503, remaining: 3 } }),
    })
  })
  await page.goto('/?category=Arte%203D')
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs.' })).toBeVisible()
  await page.getByRole('alert').getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.locator('#catalog-results').getByRole('link', { name: /Neon Vessel/ }).first()).toBeVisible({ timeout: 10_000 })
})

test('detalhe abre diretamente e NFT inexistente mostra erro', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.goto('/nft/inexistente')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('abas recortam o catálogo, aceitam teclado e combinam com os filtros', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('tab', { name: 'Todos os NFTs' })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
  await expect(page).toHaveURL(/tab=novos/)
  await expect(page.getByRole('tab', { name: 'Novos lançamentos' })).toHaveAttribute('aria-selected', 'true')
  // listados nos últimos 21 dias: três páginas de 9
  await expect(page.getByRole('button', { name: 'Página 3' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Página 4' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Novos lançamentos' }).press('ArrowRight')
  await expect(page).toHaveURL(/tab=em-alta/)
  await expect(page.getByRole('tab', { name: 'Em alta' })).toBeFocused()

  await page.getByRole('button', { name: 'Música' }).click()
  await expect(page).toHaveURL(/tab=em-alta/)
  await expect(page).toHaveURL(/category=M%C3%BAsica/)

  await page.reload()
  await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Música' })).toHaveAttribute('aria-pressed', 'true')
})

test.describe('busca no mobile', () => {
  test.use({ viewport: { width: 414, height: 896 } })

  test('o botão central da tab bar abre a busca com foco no campo', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.getByRole('link', { name: 'Explorar coleções' }).click()
    await expect(page.locator('#buscar')).toBeFocused()
    await page.keyboard.type('Golden')
    await expect(page).toHaveURL(/q=Golden/)
  })
})


test('resposta antiga da busca não substitui o resultado mais recente', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html[data-mocks-ready="true"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.evaluate(async () => {
    await fetch('/api/demo/scenario', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latencySequenceMs: [2500, 0], latencyMs: 0 }),
    })
  })
  const search = page.getByLabel('Buscar NFTs')
  const firstRequest = page.waitForRequest((request) => request.url().includes('/api/nfts?') && request.url().includes('q=Emerald'))
  await search.fill('Emerald')
  await expect(page).toHaveURL(/q=Emerald/)
  await firstRequest
  await search.fill('Golden')
  await expect(page).toHaveURL(/q=Golden/)
  await expect(page.locator('#catalogo').getByText('Golden Beat #207')).toBeVisible()
  await page.waitForTimeout(3000)
  await expect(page.locator('#catalogo').getByText('Golden Beat #207')).toBeVisible()
  await expect(page.locator('#catalogo').getByText('Emerald Ape #042')).toHaveCount(0)
})


test('painel de demonstração abre sob demanda e devolve foco ao fechar', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Abrir modo demonstração' })
  await trigger.click()
  const panel = page.getByRole('region', { name: 'Modo demonstração' })
  await expect(panel).toBeVisible()
  await expect(panel).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir modo demonstração' })).toBeFocused()
})
