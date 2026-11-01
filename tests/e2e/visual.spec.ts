import { expect, test, type Page } from '@playwright/test'

// o painel de demonstração é ferramenta de avaliação, não parte das telas do figma
const screenshotOptions = { fullPage: true, animations: 'disabled', caret: 'hide', stylePath: 'tests/e2e/visual-hide.css' } as const

async function prepareViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
}

async function waitForStableVisual(page: Page) {
  await expect(page.locator('html[data-hydrated="true"]')).toHaveCount(1)
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    // as imagens lazy fora da tela nunca carregariam: a captura de página inteira precisa de todas
    await Promise.all(Array.from(document.images, (image) => {
      image.loading = 'eager'
      return image.complete ? undefined : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }) })
    }))
  })
}

async function addNft(page: Page) {
  await page.goto('/nft/golden-beat-207')
  await expect(page.getByRole('heading', { name: 'Golden Beat #207' })).toBeVisible()
  await page.getByRole('button', { name: /comprar/i }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByText('Golden Beat #207').first()).toBeVisible()
}

async function registerAndSaveWallet(page: Page, email: string) {
  await page.goto('/carteiras')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /^(Criar conta|Crie uma conta)$/ }).first().click()
  await page.locator('#auth-name').fill('Leonardo Balk')
  await page.locator('#auth-email').fill(email)
  await page.locator('#auth-password').fill('senha-forte-1')
  await page.locator('#auth-confirm-password').fill('senha-forte-1')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()

  await page.locator('#primary-displayName').fill('Leonardo Balk')
  await page.locator('#primary-nickname').fill('Carteira principal')
  await page.locator('#primary-network').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.locator('#primary-profileName').fill('Coleção Kurio')
  await page.locator('#primary-address').fill(`0x${'a1b2c3d4e5'.repeat(4)}`)
  await page.locator('#primary-type').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await page.locator('#primary-referralCode').fill('KURIO-LEO')
  await page.locator('#primary-email').fill(email)
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira salva.')).toBeVisible()
}

test('visual regression início desktop', async ({ page }) => {
  await prepareViewport(page, 1440, 1000)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Seja dono d[oa] (futuro|cultura)/i })).toBeVisible()
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('home-desktop.png', screenshotOptions)
})

test('visual regression início mobile', async ({ page }) => {
  await prepareViewport(page, 390, 844)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Seja dono d[oa] (futuro|cultura)/i })).toBeVisible()
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('home-mobile.png', screenshotOptions)
})

test('visual regression detalhe desktop', async ({ page }) => {
  await prepareViewport(page, 1440, 1000)
  await page.goto('/nft/neon-vessel-552')
  await expect(page.getByRole('heading', { name: 'Neon Vessel #552' })).toBeVisible()
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('detail-desktop.png', screenshotOptions)
})

test('visual regression detalhe mobile', async ({ page }) => {
  await prepareViewport(page, 390, 844)
  await page.goto('/nft/neon-vessel-552')
  await expect(page.getByRole('heading', { name: 'Neon Vessel #552' })).toBeVisible()
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('detail-mobile.png', screenshotOptions)
})

test('visual regression carrinho desktop', async ({ page }) => {
  await prepareViewport(page, 1440, 1000)
  await addNft(page)
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('cart-desktop.png', screenshotOptions)
})

test('visual regression carrinho mobile', async ({ page }) => {
  await prepareViewport(page, 390, 844)
  await addNft(page)
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('cart-mobile.png', screenshotOptions)
})

test('visual regression pagamento desktop', async ({ page }) => {
  await prepareViewport(page, 1440, 1000)
  await registerAndSaveWallet(page, 'visual-desktop@kurio.test')
  await addNft(page)
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Seus NFTs' })).toBeVisible()
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('checkout-desktop.png', screenshotOptions)
})

test('visual regression pagamento mobile', async ({ page }) => {
  await prepareViewport(page, 390, 844)
  await registerAndSaveWallet(page, 'visual-mobile@kurio.test')
  await addNft(page)
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeVisible()
  await waitForStableVisual(page)
  await expect(page).toHaveScreenshot('checkout-mobile.png', screenshotOptions)
})
