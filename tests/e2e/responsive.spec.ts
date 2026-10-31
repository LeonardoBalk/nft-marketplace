import { expect, test, type Page } from '@playwright/test'

// larguras que o enunciado manda avaliar, mais o 414 do frame mobile do figma
const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
]

const routes = [
  { name: 'início', path: '/' },
  { name: 'detalhe', path: '/nft/emerald-ape-042' },
  { name: 'carrinho', path: '/carrinho' },
  { name: 'pagamento', path: '/checkout' },
  { name: 'entrar', path: '/entrar' },
  { name: 'rota inexistente', path: '/nao-existe' },
]

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
}

for (const viewport of viewports) {
  test(`sem overflow horizontal em ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const route of routes) {
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')
      expect(await horizontalOverflow(page), `${route.name} em ${viewport.name}px`).toBeLessThanOrEqual(0)
    }
  })
}

test('o modal de autenticação cabe na largura do celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/entrar')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(390)
  expect(box!.x).toBeGreaterThanOrEqual(0)
})
