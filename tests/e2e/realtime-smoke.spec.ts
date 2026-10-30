import { expect, test } from '@playwright/test'

test('a catalog change reaches the page through Socket.IO', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('1.19 ETH')).toBeVisible()

  const response = await page.evaluate(async () => {
    const request = await fetch('/api/demo/nfts/emerald-ape-042/price', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceEth: '1.29' }),
    })
    return request.status
  })

  expect(response).toBe(200)
  await expect(page.getByText('1.29 ETH')).toBeVisible()
})
