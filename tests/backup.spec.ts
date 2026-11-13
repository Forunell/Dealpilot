import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { emptyDatabase, MAX_BYTES, parseDatabase } from '../src/domain'

test('a backup near the storage limit can be imported without losing contacts', async ({ page }) => {
  const data = emptyDatabase()
  data.contacts = Array.from({ length: 1800 }, (_, index) => ({
    id: `backup-${index}`, name: `Contact ${index}`, company: '', email: '', phone: '', notes: '', demo: true,
  }))
  const available = MAX_BYTES - Buffer.byteLength(JSON.stringify(data)) - 10000
  for (const contact of data.contacts) contact.notes = 'x'.repeat(Math.floor(available / data.contacts.length))
  const raw = JSON.stringify(data)
  expect(Buffer.byteLength(raw)).toBeLessThan(MAX_BYTES)
  expect(Buffer.byteLength(JSON.stringify(data, null, 2))).toBeGreaterThan(MAX_BYTES)
  await page.goto('/')
  await page.evaluate(raw => localStorage.setItem('dealpilot.data.v1', raw), raw)
  await page.reload()
  await page.getByRole('button', { name: 'Дані та налаштування', exact: true }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Експорт JSON', exact: true }).click(),
  ])
  const path = (await download.path())!
  const backup = readFileSync(path, 'utf8')
  expect(Buffer.byteLength(backup)).toBeLessThanOrEqual(MAX_BYTES)
  expect(parseDatabase(backup)).toEqual(data)
  await page.getByRole('button', { name: 'Очистити всі дані', exact: true }).click()
  await page.getByRole('button', { name: 'Видалити всі дані', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByLabel('Імпорт JSON', { exact: true }).setInputFiles(path)
  await page.getByRole('button', { name: 'Замінити локальні дані', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('dealpilot.data.v1')!))
  expect(restored.contacts).toEqual(data.contacts)
  expect(restored.history[0].action).toBe('system')
})
