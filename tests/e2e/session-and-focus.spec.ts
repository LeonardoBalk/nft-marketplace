import { expect, test, type Page } from '@playwright/test'

// png 1x1 válido para testar a leitura do avatar
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function logIn(page: Page, email: string) {
  await page.getByRole('button', { name: 'Entrar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.locator('#auth-email').fill(email)
  await page.locator('#auth-password').fill('Kurio@2026')
  await page.locator('button[form="auth-form"]').click()
  await expect(dialog).toBeHidden()
}

async function signOut(page: Page, name: string) {
  await page.getByRole('button', { name: `Menu da conta de ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

test('trocar de usuário não vaza favoritos nem carrinho da conta anterior', async ({ page }) => {
  await page.goto('/nft/neon-vessel-552')
  await expect(page.getByRole('heading', { name: 'Neon Vessel #552' })).toBeVisible()
  await logIn(page, 'test@kurio.test')

  const favorite = page.getByRole('button', { name: /Neon Vessel #552 (aos|dos) favoritos$/ }).first()
  if (await favorite.getAttribute('aria-pressed') === 'false') await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByRole('status', { name: 'Quantidade de Neon Vessel #552' })).toBeVisible()

  await signOut(page, 'Test')
  await logIn(page, 'test2@kurio.test')
  await expect(page.getByRole('button', { name: 'Menu da conta de Test 2' })).toBeVisible()

  // a segunda conta parte dos próprios dados, sem herdar o cache da primeira
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: /carrinho/i }).first()).toBeVisible()
  await expect(page.getByRole('status', { name: 'Quantidade de Neon Vessel #552' })).toHaveCount(0)
  await page.goto('/nft/neon-vessel-552')
  await expect(page.getByRole('button', { name: /Neon Vessel #552 (aos|dos) favoritos$/ }).first()).toHaveAttribute('aria-pressed', 'false')

  // voltar para a primeira conta recupera o que ela tinha
  await signOut(page, 'Test 2')
  await logIn(page, 'test@kurio.test')
  await expect(page.getByRole('button', { name: /Neon Vessel #552 (aos|dos) favoritos$/ }).first()).toHaveAttribute('aria-pressed', 'true')
})

test('avatar valida o arquivo, aparece no header e pode ser removido', async ({ page }) => {
  await page.goto('/')
  await logIn(page, 'test2@kurio.test')
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

  const avatarInput = page.locator('#avatar')
  await avatarInput.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') })
  await expect(page.getByRole('alert').filter({ hasText: 'Selecione um arquivo de imagem.' })).toBeVisible()
  await avatarInput.setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(301 * 1024) })
  await expect(page.getByRole('alert').filter({ hasText: 'A imagem deve ter no máximo 300 KB.' })).toBeVisible()

  await avatarInput.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: tinyPng })
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
  const headerAvatar = page.getByRole('button', { name: 'Menu da conta de Test 2' }).locator('img')
  await expect(headerAvatar).toHaveAttribute('src', /^data:image\/png/)

  await page.reload()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toHaveCount(0)
  await expect(headerAvatar).toHaveCount(0)
})

test('modal de autenticação prende o foco, valida e devolve o foco ao fechar', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Entrar' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeFocused()

  // o tab percorre só o modal: nada da página fica alcançável por trás dele
  // (o dialog nativo passa pela interface do navegador antes de voltar, e aí o foco fica no body)
  for (let step = 0; step < 15; step++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((element) => element.contains(document.activeElement) || document.activeElement === document.body)).toBe(true)
  }

  await page.locator('button[form="auth-form"]').click()
  await expect(page.locator('#auth-email')).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test.describe('foco no mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('filtros abrem como diálogo, prendem o foco e devolvem ao botão', async ({ page }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: 'Abrir filtros' })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(page.getByRole('button', { name: 'Fechar filtros' })).toBeFocused()

    for (let step = 0; step < 25; step++) {
      await page.keyboard.press('Tab')
      expect(await sheet.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await sheet.evaluate((element) => element.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('perfil e carteiras trocam pelas abas da conta sem estourar a largura', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.locator('#auth-email').fill('test2@kurio.test')
    await page.locator('#auth-password').fill('Kurio@2026')
    await page.locator('button[form="auth-form"]').click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.goto('/perfil')
    const sections = page.getByRole('navigation', { name: 'Seções da conta' })
    await expect(sections.getByRole('link', { name: 'Dados do perfil' })).toHaveAttribute('aria-current', 'page')
    await sections.getByRole('link', { name: 'Carteiras' }).click()
    await expect(page).toHaveURL(/\/carteiras$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
    await expect(page.getByLabel('ENS ou carteira secundária').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/(\?[^#]*)?(#.*)?$/)
  })
})
