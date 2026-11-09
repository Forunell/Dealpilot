import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { demoDatabase } from './demo'
import { csvCell, datedDeal, emptyDatabase, exportCsv, inPeriod, metrics, monthlyWins, moveDeal, parseDatabase, Repository, STORAGE_KEY, toggleTask } from './domain'

describe('v2: міграція, зв’язки та часові показники', () => {
  it('мігрує v1 без вигаданих дат і зберігає оригінал перед першою зміною', () => {
    const original = readFileSync('TEST_DATA/example.json', 'utf8')
    const values = new Map([[STORAGE_KEY, original]])
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const repo = new Repository(storage), data = repo.load()
    expect(data.version).toBe(2)
    expect(data.deals.every(d => d.createdAt === null && d.closedAt === null)).toBe(true)
    expect(values.get(STORAGE_KEY)).toBe(original)
    repo.save(data)
    expect(values.get('dealpilot.backup.v1')).toBe(original)
    expect(new Repository(storage).load()).toEqual(data)
    expect(metrics(data, 'UAH', '2026-11-07', 'month').open).toBe(0)
    expect(metrics(data, 'UAH', '2026-11-07', 'all').open).toBeGreaterThan(0)
  })
  it('фіксує won/lost, не змінює дату при редагуванні та очищає її при відкритті', () => {
    const data = demoDatabase()
    let next = moveDeal(data, data.deals[0].id, 'Втрачено')
    expect(next.deals[0]).toMatchObject({ status: 'lost', stage: 'Втрачено' })
    expect(next.deals[0].closedAt).toBeTruthy()
    const edited = datedDeal({ ...next.deals[0], amount: 123 }, next.deals[0], '2099-01-01T00:00:00.000Z')
    expect(edited.closedAt).toBe(next.deals[0].closedAt)
    next = moveDeal(next, data.deals[0].id, 'Контакт')
    expect(next.deals[0]).toMatchObject({ status: 'open', closedAt: null })
    expect(next.history[0]).toMatchObject({ entityId: data.deals[0].id, entityType: 'deal', action: 'stage' })
  })
  it('рахує win-rate, середній чек і прогноз окремо за валютою та періодом', () => {
    const source = demoDatabase().deals[0]
    const data = emptyDatabase()
    data.deals = [
      { ...source, id: 'a', status: 'won', stage: 'Виграно', closedAt: '2026-11-01T12:00:00Z', amount: 2000 },
      { ...source, id: 'b', status: 'lost', stage: 'Втрачено', closedAt: '2026-11-02T12:00:00Z', amount: 3000 },
      { ...source, id: 'c', status: 'won', stage: 'Виграно', closedAt: '2026-10-02T12:00:00Z', amount: 8000 },
      { ...source, id: 'd', status: 'won', stage: 'Виграно', closedAt: '2026-11-02T12:00:00Z', currency: 'USD', amount: 900 },
      { ...source, id: 'e', createdAt: '2026-11-03T12:00:00Z', amount: 1000, probability: 25 },
    ]
    expect(metrics(data, 'UAH', '2026-11-07', 'month')).toMatchObject({ won: 1, lost: 1, winRate: 50, average: 2000, forecast: 250, open: 1 })
    expect(metrics(data, 'USD', '2026-11-07', 'month')).toMatchObject({ won: 1, winRate: 100, average: 900, forecast: 0 })
    expect(metrics(emptyDatabase(), 'UAH')).toMatchObject({ winRate: null, average: null })
  })
  it('враховує календарні межі місяця, кварталу та року, відкидає майбутні дати', () => {
    expect(inPeriod('2026-11-01', 'month', '2026-11-07')).toBe(true)
    expect(inPeriod('2026-10-31', 'month', '2026-11-07')).toBe(false)
    expect(inPeriod('2026-11-08', 'month', '2026-11-07')).toBe(false)
    expect(inPeriod('2026-10-01', 'quarter', '2026-11-07')).toBe(true)
    expect(inPeriod('2026-09-30', 'quarter', '2026-11-07')).toBe(false)
    expect(inPeriod('2025-12-31', 'year', '2026-11-07')).toBe(false)
    expect(inPeriod(null, 'month')).toBe(false)
  })
  it('будує динаміку за датами закриття, пропускає невідомі дати', () => {
    const source = demoDatabase().deals[0]
    const bins = monthlyWins([{ ...source, stage: 'Виграно', status: 'won', amount: 3000, closedAt: '2026-11-01T12:00:00Z' }, { ...source, stage: 'Виграно', status: 'won', closedAt: null }], '2026-11-07')
    expect(bins).toHaveLength(6)
    expect(bins.at(-1)).toMatchObject({ month: '2026-11', count: 1, amount: 3000 })
  })
  it('завершує та відновлює незалежне завдання зі збереженням історії', () => {
    const data = demoDatabase(); data.tasks[0].dealId = null
    const next = toggleTask(data, data.tasks[0])
    expect(next.tasks[0].completedAt).toBeTruthy()
    expect(next.tasks[0].done).toBe(true)
    expect(toggleTask(next, next.tasks[0]).tasks[0]).toMatchObject({ done: false, completedAt: null })
    expect(() => parseDatabase(JSON.stringify(next))).not.toThrow()
  })
  it('відхиляє невідомі enum та суперечливі статуси без перезапису', () => {
    const data = demoDatabase()
    data.deals[0].status = 'won'
    expect(() => parseDatabase(JSON.stringify(data))).toThrow('Статус')
    expect(() => parseDatabase(JSON.stringify({ ...emptyDatabase(), tasks: [{ priority: 'urgent' }] }))).toThrow()
  })
})

describe('безпечний CSV', () => {
  it('нейтралізує формули з пробілами, табуляцією та Unicode BOM', () => {
    for (const value of ['=1+1', '+CMD', '-1+2', '@SUM(A1)', '  =HYPERLINK("x")', '\t=x', '\uFEFF=1']) expect(csvCell(value)).toMatch(/^"'/)
    expect(csvCell('Коло, "тест"\nрядок')).toBe('"Коло, ""тест""\nрядок"')
  })
  it('експортує всі три розділи у UTF-8 з коректними заголовками', () => {
    const data = demoDatabase()
    expect(exportCsv(data, 'deals')).toContain('"Угода"')
    expect(exportCsv(data, 'contacts')).toContain('"Ім’я"')
    expect(exportCsv(data, 'tasks')).toContain('"Пріоритет"')
    expect(exportCsv(data, 'deals').charCodeAt(0)).toBe(0xfeff)
    expect(exportCsv(data, 'deals').split('\r\n')).toHaveLength(21)
  })
})
