import { expect, test } from '@playwright/test'

test('HTML público pré-renderizado contém catálogo e detalhe de cada NFT', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  for (const [path, name] of [['/', 'Emerald Ape #042'], ['/nft/emerald-ape-042', 'Emerald Ape #042'], ['/nft/golden-beat-207', 'Golden Beat #207']]) {
    await page.goto(path)
    await expect(page.getByText(name).first()).toBeVisible()
    const state = await page.locator('#__QUERY_STATE__').textContent()
    expect(state).toBeTruthy()
    const queries = JSON.parse(state!).queries as Array<{ queryKey: string[] }>
    expect(queries.every((query) => query.queryKey[0] === 'nfts')).toBe(true)
    const images = page.locator('img[fetchpriority="high"]')
    await expect(images.first()).toBeAttached()
  }
  await page.goto('/carrinho')
  await expect(page.locator('#__QUERY_STATE__')).toHaveCount(0)
  await expect(page.locator('#root')).toBeEmpty()
  await context.close()
})

test('hidratação reconcilia preço e estoque persistidos sem erro', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('kurio.demo.catalog.v1', JSON.stringify({ 'emerald-ape-042': { priceEth: '2.123456789', available: 9, version: 9 } }))
  })
  for (const path of ['/', '/nft/emerald-ape-042']) {
    await page.goto(path)
    await expect(page.getByText('2.123456789 ETH').first()).toBeVisible()
    await expect(page.locator('#__QUERY_STATE__')).toHaveAttribute('data-path', path)
    expect(errors.filter((error) => /hydration|react error #4(18|23)/i.test(error))).toEqual([])
  }
})


test('busca só aceita texto depois da hidratação', async ({ page }) => {
  let releaseScripts!: () => void
  const scriptsReady = new Promise<void>((resolve) => { releaseScripts = resolve })
  await page.route(/\.js(?:\?.*)?$/, async (route) => {
    await scriptsReady
    await route.continue()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'commit' })
  const search = page.locator('#buscar')
  await expect(search).toBeVisible()
  await expect(search).toBeDisabled()
  await expect(search).toHaveAttribute('placeholder', 'Carregando busca...')
  releaseScripts()
  await expect(search).toBeEnabled()
  await search.fill('Golden')
  await search.press('Enter')
  await expect(search).toHaveValue('Golden')
  await expect(page).toHaveURL(/q=Golden/i)
})
