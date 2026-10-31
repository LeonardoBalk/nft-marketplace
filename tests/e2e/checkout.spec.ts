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
  await page.getByRole('button', { name: 'Confirmar compra' }).click()

  // recibo em modal com snapshot do pedido
  const receipt = page.getByRole('dialog')
  await expect(receipt.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(receipt.getByText('ID da transação')).toBeVisible()
  await expect(receipt.getByText('(x 2)')).toBeVisible()
  await expect(receipt.getByText('MetaMask')).toBeVisible()
  await expect(page.locator('header a[href="/carrinho"]')).toHaveText('')

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
  await expect(page.getByText('(-) 0.10')).toBeVisible()
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
