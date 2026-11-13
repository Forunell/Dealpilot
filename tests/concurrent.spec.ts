import { test, expect } from '@playwright/test'

test('contact table scrolls inside its container at mobile widths', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Завантажити демодані', exact: true }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Контакти', exact: true }).click()
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('confirmed recovery resets the version marker and allows saving again', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Завантажити демодані', exact: true }).click()
  await expect(page.getByTestId('kpi-open')).not.toHaveText('00')
  await page.evaluate(() => localStorage.setItem('dealpilot.data.v1', '{damaged'))
  await page.reload()
  await page.getByRole('button', { name: 'Очистити сховище', exact: true }).click()
  await page.getByRole('button', { name: 'Очистити назавжди', exact: true }).click()
  await page.getByRole('button', { name: 'Завантажити демодані', exact: true }).click()
  await expect(page.getByTestId('kpi-open')).not.toHaveText('00')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dealpilot.data.v1')!).deals.length)).toBe(20)
})

test('simultaneous writers share a lock and preserve the winning write', async ({ page, context }) => {
  await page.goto('/')
  const second = await context.newPage()
  await second.goto('/')
  for (const [tab, title] of [[page, 'Перша одночасна угода'], [second, 'Друга одночасна угода']] as const) {
    await tab.getByRole('button', { name: 'Нова угода', exact: true }).click()
    await tab.getByLabel('Назва угоди *').fill(title)
    await tab.getByLabel('Сума *').fill('100')
  }
  await page.evaluate(() => {
    void navigator.locks.request('dealpilot.data.v1', () => new Promise<void>(resolve => {
      Object.assign(window, { releaseAuditLock: resolve })
    }))
  })
  await page.waitForFunction(() => 'releaseAuditLock' in window)
  await Promise.all([page, second].map(tab => tab.getByRole('button', { name: 'Зберегти', exact: true }).click()))
  await page.evaluate(() => (window as unknown as { releaseAuditLock: () => void }).releaseAuditLock())
  await expect.poll(async () => {
    return await page.evaluate(() => JSON.parse(localStorage.getItem('dealpilot.data.v1') || '{"deals":[]}').deals.length)
  }).toBe(1)
  await expect.poll(async () => await page.getByRole('dialog').count() + await second.getByRole('dialog').count()).toBe(1)
  const loser = await page.getByRole('dialog').count() ? page : second
  await expect(loser.getByRole('dialog').getByRole('alert')).toContainText('Зміни не збережено')
  await second.close()
})
