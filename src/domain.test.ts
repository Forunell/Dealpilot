import { describe, expect, it } from 'vitest'
import { Repository, STORAGE_KEY, contactSchema, dateSchema, dealSchema, emptyDatabase, localDate, metrics, moveDeal, parseDatabase, removeContact, removeDeal, type Database } from './domain'
import { demoDatabase } from './demo'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
describe('обчислення та зв’язки', () => {
  it('обчислює прогноз лише відкритих угод потрібної валюти', () => {
    const data = demoDatabase(new Date('2026-11-03T12:00:00'))
    data.deals = [
      { ...data.deals[0], id: 'a', amount: 1000, probability: 50, currency: 'UAH', stage: 'Нові' },
      { ...data.deals[0], id: 'b', amount: 200, probability: 25, currency: 'USD', stage: 'Контакт' },
      { ...data.deals[0], id: 'c', amount: 3000, probability: 100, currency: 'UAH', stage: 'Виграно', status: 'won' },
    ]
    expect(metrics(data, 'UAH', '2026-11-03')).toMatchObject({ open: 1, forecast: 500, won: 1, wonAmount: 3000, today: 4, overdue: 2 })
    expect(metrics(data, 'USD', '2026-11-03').forecast).toBe(50)
  })
  it('після завершення перераховує KPI та додає реальну подію', () => {
    const data = demoDatabase()
    const before = metrics(data, 'UAH')
    const moved = moveDeal(data, data.deals[0].id, 'Виграно')
    expect(metrics(moved, 'UAH').open).toBe(before.open - 1)
    expect(metrics(moved, 'UAH').won).toBe(before.won + 1)
    expect(metrics(moved, 'UAH').forecast).toBeCloseTo(before.forecast - 7200)
    expect(moved.history[0].text).toContain('Нові → Виграно')
    expect(data.deals[0].stage).toBe('Нові')
    expect(moveDeal(moved, moved.deals[0].id, 'Виграно')).toBe(moved)
  })
  it('не видаляє угоди й завдання разом із контактом', () => {
    const data = demoDatabase()
    const result = removeContact(data, data.contacts[0].id)
    expect(result.contacts).toHaveLength(11)
    expect(result.deals).toHaveLength(20)
    expect(result.tasks).toHaveLength(9)
    expect(result.deals[0].contactId).toBeNull()
    expect(() => parseDatabase(JSON.stringify(result))).not.toThrow()
  })
  it('видаляє завдання угоди, зберігаючи інші зв’язки', () => {
    const data = demoDatabase()
    const result = removeDeal(data, data.deals[0].id)
    expect(result.deals).toHaveLength(19)
    expect(result.tasks).toHaveLength(8)
    expect(result.contacts).toHaveLength(12)
    expect(() => parseDatabase(JSON.stringify(result))).not.toThrow()
  })
  it('повертає нулі для порожнього простору', () => {
    expect(metrics(emptyDatabase(), 'EUR')).toMatchObject({ open: 0, forecast: 0, won: 0, wonAmount: 0, today: 0, overdue: 0 })
  })
  it('формує календарну дату без зсуву в UTC', () => {
    const date = new Date(2026, 10, 3, 0, 1)
    expect(localDate(date)).toBe('2026-11-03')
  })
})
describe('валідація та імпорт', () => {
  it('приймає неповні контакти, відхиляє невалідний email і телефон', () => {
    const contact = demoDatabase().contacts[0]
    expect(contactSchema.safeParse({ ...contact, email: '', phone: '' }).success).toBe(true)
    expect(contactSchema.safeParse({ ...contact, email: 'not-an-email' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...contact, phone: 'letters123' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...contact, phone: '+380 (00) 000-00-00' }).success).toBe(true)
    expect(contactSchema.safeParse({ ...contact, name: '   ' }).success).toBe(false)
  })
  it('відхиляє від’ємні та нескінченні суми й некоректну ймовірність', () => {
    const deal = demoDatabase().deals[0]
    for (const amount of [-1, Infinity, NaN]) expect(dealSchema.safeParse({ ...deal, amount }).success).toBe(false)
    expect(dealSchema.safeParse({ ...deal, probability: 101 }).success).toBe(false)
    expect(dealSchema.safeParse({ ...deal, probability: 4.5 }).success).toBe(false)
  })
  it('перевіряє справжність календарних дат', () => {
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false)
    expect(dateSchema.safeParse('2026-02-29').success).toBe(false)
    expect(dateSchema.safeParse('2028-02-29').success).toBe(true)
    expect(dateSchema.safeParse('2026-13-01').success).toBe(false)
  })
  it('зберігає всі записи та зв’язки при експорті-імпорті', () => {
    const data = demoDatabase()
    expect(parseDatabase(JSON.stringify(data))).toEqual(data)
    expect(data.contacts).toHaveLength(12)
    expect(data.deals).toHaveLength(20)
    expect(data.contacts.every(c => c.demo)).toBe(true)
  })
  it('відхиляє пошкоджений JSON, невідому версію та зайві поля', () => {
    expect(() => parseDatabase('{broken')).toThrow()
    expect(() => parseDatabase(JSON.stringify({ ...emptyDatabase(), version: 99 }))).toThrow()
    expect(() => parseDatabase(JSON.stringify({ ...emptyDatabase(), injected: true }))).toThrow()
  })
  it('відхиляє дублікати ID та розірвані зв’язки', () => {
    const data = demoDatabase()
    expect(() => parseDatabase(JSON.stringify({ ...data, contacts: [...data.contacts, data.contacts[0]] }))).toThrow()
    expect(() => parseDatabase(JSON.stringify({ ...data, contacts: [] }))).toThrow()
    expect(() => parseDatabase(JSON.stringify({ ...data, deals: [] }))).toThrow()
  })
  it('відхиляє завеликий файл до розбору', () => {
    expect(() => parseDatabase(' '.repeat(3 * 1024 * 1024 + 1))).toThrow('3 МБ')
  })
})
describe('атомарне сховище', () => {
  it('нове сховище порожнє, а повторне відкриття зберігає дані', () => {
    const memory = storage(), first = new Repository(memory)
    expect(first.load()).toEqual(emptyDatabase())
    const data = demoDatabase()
    first.save(data)
    expect(new Repository(memory).load()).toEqual(data)
  })
  it('пошкоджене сховище не перезаписується під час читання', () => {
    const memory = storage(); memory.setItem(STORAGE_KEY, '{bad')
    expect(() => new Repository(memory).load()).toThrow()
    expect(memory.getItem(STORAGE_KEY)).toBe('{bad')
  })
  it('не змінює попередній знімок при помилці квоти', () => {
    const memory = storage(), data = demoDatabase()
    memory.setItem(STORAGE_KEY, JSON.stringify(data))
    const repo = new Repository({ ...memory, setItem: () => { throw new Error('quota') } })
    repo.load()
    expect(() => repo.save(emptyDatabase())).toThrow('Не вдалося зберегти')
    expect(new Repository(memory).load()).toEqual(data)
  })
  it('не записує невалідну базу', () => {
    const memory = storage(), repo = new Repository(memory)
    repo.load(); repo.save(demoDatabase())
    const previous = memory.getItem(STORAGE_KEY)
    expect(() => repo.save({ ...emptyDatabase(), version: 9 } as unknown as Database)).toThrow()
    expect(memory.getItem(STORAGE_KEY)).toBe(previous)
  })
  it('виявляє застарілий знімок з іншої вкладки', () => {
    const memory = storage(), first = new Repository(memory), second = new Repository(memory)
    first.load(); second.load()
    first.save(demoDatabase())
    expect(() => second.save(emptyDatabase())).toThrow('іншій вкладці')
    expect(new Repository(memory).load().deals).toHaveLength(20)
  })
})
