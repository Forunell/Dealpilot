import { z } from 'zod'

export const STAGES = ['Нові', 'Контакт', 'Пропозиція', 'Перемовини', 'Виграно', 'Втрачено'] as const
export const CURRENCIES = ['UAH', 'USD', 'EUR'] as const
export type Stage = typeof STAGES[number]
export type Currency = typeof CURRENCIES[number]
const id = z.string().min(1).max(100)
const short = z.string().trim().max(160)
const required = short.min(1, 'Заповніть обов’язкове поле')
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01'
}, 'Вкажіть коректну дату')
const optionalDate = z.union([z.literal(''), dateSchema])
export const contactSchema = z.object({
  id, name: required, company: short,
  email: z.union([z.literal(''), z.string().trim().max(254).email('Перевірте email')]),
  phone: z.string().trim().max(30).refine(value => !value || (/^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15), 'Телефон: 7–15 цифр, пробіли, +, () або -'),
  notes: z.string().max(5000), demo: z.boolean(),
}).strict()
const timestamp = z.string().datetime().nullable()
export const dealSchema = z.object({
  id, title: required, contactId: id.nullable(), amount: z.number().finite().min(0, 'Сума не може бути від’ємною').max(1_000_000_000),
  currency: z.enum(CURRENCIES), stage: z.enum(STAGES), expectedDate: optionalDate,
  probability: z.number().int().min(0).max(100), owner: short,
  notes: z.string().max(5000), demo: z.boolean(),
  createdAt: timestamp, updatedAt: timestamp, closedAt: timestamp,
  status: z.enum(['open', 'won', 'lost']), lostReason: z.string().max(1000),
}).strict()
export const taskSchema = z.object({ id, title: required, dealId: id.nullable(), dueDate: dateSchema, done: z.boolean(), demo: z.boolean(), priority: z.enum(['low', 'medium', 'high']), createdAt: timestamp, completedAt: timestamp }).strict()
const eventSchema = z.object({ id, at: z.string().datetime(), text: z.string().min(1).max(600), action: z.enum(['create', 'update', 'delete', 'stage', 'complete', 'restore', 'system']), entityType: z.enum(['deal', 'contact', 'task']).nullable(), entityId: id.nullable() }).strict()
const databaseObject = z.object({
  version: z.literal(2), contacts: z.array(contactSchema).max(2000), deals: z.array(dealSchema).max(5000),
  tasks: z.array(taskSchema).max(10000), history: z.array(eventSchema).max(2000),
  settings: z.object({ workspaceName: required }).strict(),
}).strict()
export const databaseSchema = databaseObject.superRefine((data, ctx) => {
  for (const key of ['contacts', 'deals', 'tasks', 'history'] as const) {
    if (new Set(data[key].map(item => item.id)).size !== data[key].length) ctx.addIssue({ code: 'custom', message: `Повторні ID: ${key}` })
  }
  const contacts = new Set(data.contacts.map(c => c.id))
  const deals = new Set(data.deals.map(d => d.id))
  if (data.deals.some(d => d.contactId !== null && !contacts.has(d.contactId))) ctx.addIssue({ code: 'custom', message: 'Угода посилається на відсутній контакт' })
  if (data.tasks.some(t => t.dealId !== null && !deals.has(t.dealId))) ctx.addIssue({ code: 'custom', message: 'Завдання посилається на відсутню угоду' })
  if (data.deals.some(d => d.status !== statusFor(d.stage) || (d.status === 'open' && d.closedAt !== null))) ctx.addIssue({ code: 'custom', message: 'Статус або дата закриття не відповідають стадії' })
  if (data.deals.some(d => d.createdAt && d.updatedAt && d.createdAt > d.updatedAt)) ctx.addIssue({ code: 'custom', message: 'Оновлення передує створенню угоди' })
  if (data.tasks.some(t => !t.done && t.completedAt !== null)) ctx.addIssue({ code: 'custom', message: 'Незавершене завдання має дату завершення' })
})
export type Contact = z.infer<typeof contactSchema>
export type Deal = z.infer<typeof dealSchema>
export type Task = z.infer<typeof taskSchema>
export type Database = z.infer<typeof databaseSchema>
export const emptyDatabase = (): Database => ({ version: 2, contacts: [], deals: [], tasks: [], history: [], settings: { workspaceName: 'Forma Bureau' } })
export const uid = () => crypto.randomUUID()
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function record(data: Database, text: string, entityType: Database['history'][number]['entityType'] = null, entityId: string | null = null, action: Database['history'][number]['action'] = 'system'): Database {
  return { ...data, history: [{ id: uid(), at: new Date().toISOString(), text, entityType, entityId, action }, ...data.history].slice(0, 2000) }
}
export const statusFor = (stage: Stage): Deal['status'] => stage === 'Виграно' ? 'won' : stage === 'Втрачено' ? 'lost' : 'open'
export function datedDeal(deal: Deal, previous?: Deal, now = new Date().toISOString()): Deal {
  const status = statusFor(deal.stage)
  return { ...deal, status, createdAt: previous ? previous.createdAt : now, updatedAt: now, closedAt: status === 'open' ? null : previous?.stage === deal.stage ? previous.closedAt : now }
}
export function moveDeal(data: Database, dealId: string, stage: Stage): Database {
  const deal = data.deals.find(d => d.id === dealId)
  if (!deal || deal.stage === stage) return data
  return record({ ...data, deals: data.deals.map(d => d.id === dealId ? datedDeal({ ...d, stage }, d) : d) }, `Переміщено «${deal.title}»: ${deal.stage} → ${stage}`, 'deal', dealId, 'stage')
}
export function removeContact(data: Database, contactId: string) {
  return record({ ...data, contacts: data.contacts.filter(c => c.id !== contactId), deals: data.deals.map(d => d.contactId === contactId ? { ...d, contactId: null, updatedAt: new Date().toISOString() } : d) }, 'Видалено контакт. Пов’язані угоди збережено без контакту.', 'contact', contactId, 'delete')
}
export function removeDeal(data: Database, dealId: string) {
  const deal = data.deals.find(d => d.id === dealId)
  return record({ ...data, deals: data.deals.filter(d => d.id !== dealId), tasks: data.tasks.filter(t => t.dealId !== dealId) }, `Видалено угоду «${deal?.title}» та її завдання`, 'deal', dealId, 'delete')
}
export type Period = 'all' | 'month' | 'quarter' | 'year'
export function inPeriod(date: string | null, period: Period, today = localDate()) {
  if (period === 'all') return true
  if (!date) return false
  const day = date.includes('T') ? localDate(new Date(date)) : date
  const start = period === 'month' ? `${today.slice(0, 7)}-01` : period === 'year' ? `${today.slice(0, 4)}-01-01` : `${today.slice(0, 4)}-${String(Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
  return day >= start && day <= today
}
export function scopedDeals(data: Database, currency: Currency, period: Period, today = localDate()) {
  return data.deals.filter(d => d.currency === currency && inPeriod(d.status === 'open' ? d.createdAt : d.closedAt, period, today))
}
export function metrics(data: Database, currency: Currency, today = localDate(), period: Period = 'all') {
  const deals = scopedDeals(data, currency, period, today)
  const open = deals.filter(d => d.status === 'open')
  const won = deals.filter(d => d.status === 'won')
  const lost = deals.filter(d => d.status === 'lost')
  const wonAmount = won.reduce((sum, d) => sum + d.amount, 0)
  return {
    open: open.length,
    forecast: open.filter(d => d.currency === currency).reduce((sum, d) => sum + Math.round(d.amount * d.probability) / 100, 0),
    won: won.length, wonAmount, lost: lost.length,
    average: won.length ? wonAmount / won.length : null,
    winRate: won.length + lost.length ? won.length / (won.length + lost.length) * 100 : null,
    today: data.tasks.filter(t => !t.done && t.dueDate === today).length,
    overdue: data.tasks.filter(t => !t.done && t.dueDate < today).length,
  }
}
export function toggleTask(data: Database, task: Task): Database {
  return record({ ...data, tasks: data.tasks.map(t => t.id === task.id ? { ...t, done: !t.done, completedAt: t.done ? null : new Date().toISOString() } : t) }, `${task.done ? 'Повернуто до роботи' : 'Виконано'} завдання «${task.title}»`, 'task', task.id, task.done ? 'restore' : 'complete')
}
export function monthlyWins(deals: Deal[], today = localDate()) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 6 + index, 1)
    const month = localDate(date).slice(0, 7)
    const won = deals.filter(d => d.status === 'won' && d.closedAt && localDate(new Date(d.closedAt)).startsWith(month))
    return { month, label: date.toLocaleDateString('uk-UA', { month: 'short' }), count: won.length, amount: won.reduce((sum, d) => sum + d.amount, 0) }
  })
}
export const money = (amount: number, currency: Currency) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
export const prettyDate = (date: string) => date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)) : 'Без дати'

export const STORAGE_KEY = 'dealpilot.data.v1'
export const MAX_BYTES = 3 * 1024 * 1024
export function parseDatabase(raw: string): Database {
  if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Файл завеликий. Максимум — 3 МБ.')
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('Не вдалося прочитати JSON. Перевірте формат файлу.') }
  if (value && typeof value === 'object' && 'version' in value && value.version === 1) value = migrateLegacy(value)
  const result = databaseSchema.safeParse(value)
  if (!result.success) throw new Error(`Некоректні дані: ${result.error.issues[0].message}. Поточні записи не змінено.`)
  return result.data
}
// Validate the original shape before migrating. Unknown historical dates stay unknown.
const legacySchema = databaseObject.omit({ settings: true }).extend({
  version: z.literal(1),
  deals: z.array(dealSchema.omit({ createdAt: true, updatedAt: true, closedAt: true, status: true, lostReason: true }).extend({ stage: z.enum(['Нові', 'Контакт', 'Пропозиція', 'Перемовини', 'Завершено']) })).max(5000),
  tasks: z.array(taskSchema.omit({ priority: true, createdAt: true, completedAt: true }).extend({ dealId: id })).max(10000),
  history: z.array(eventSchema.omit({ action: true, entityType: true, entityId: true })).max(2000),
})
function migrateLegacy(value: unknown) {
  const parsed = legacySchema.safeParse(value)
  if (!parsed.success) throw new Error('Некоректні дані старого формату. Оригінал збережено.')
  const old = parsed.data
  return { ...old, version: 2, settings: { workspaceName: 'Forma Bureau' },
    deals: old.deals.map(d => ({ ...d, stage: d.stage === 'Завершено' ? 'Виграно' : d.stage, status: d.stage === 'Завершено' ? 'won' : 'open', createdAt: null, updatedAt: null, closedAt: null, lostReason: '' })),
    tasks: old.tasks.map(t => ({ ...t, priority: 'medium', createdAt: null, completedAt: null })),
    history: old.history.map(h => ({ ...h, action: 'system', entityType: null, entityId: null })),
  }
}
export function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function exportCsv(data: Database, kind: 'deals' | 'contacts' | 'tasks') {
  const rows: unknown[][] = kind === 'deals' ? [['ID', 'Угода', 'Контакт ID', 'Сума', 'Валюта', 'Стадія', 'Імовірність', 'Очікувана дата', 'Створено', 'Закрито'], ...data.deals.map(d => [d.id, d.title, d.contactId, d.amount, d.currency, d.stage, d.probability, d.expectedDate, d.createdAt, d.closedAt])]
    : kind === 'contacts' ? [['ID', 'Ім’я', 'Компанія', 'Email', 'Телефон'], ...data.contacts.map(c => [c.id, c.name, c.company, c.email, c.phone])]
    : [['ID', 'Завдання', 'Угода ID', 'Строк', 'Пріоритет', 'Виконано', 'Дата завершення'], ...data.tasks.map(t => [t.id, t.title, t.dealId, t.dueDate, t.priority, t.done, t.completedAt])]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
export class Repository {
  private previous: string | null = null
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {}
  load(): Database {
    const raw = this.storage.getItem(STORAGE_KEY)
    const data = raw === null ? emptyDatabase() : parseDatabase(raw)
    this.previous = raw
    return data
  }
  save(data: Database) {
    const validated = databaseSchema.parse(data)
    const raw = JSON.stringify(validated)
    if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Сховище перевищило 3 МБ. Експортуйте дані та скоротіть кількість записів.')
    if (this.storage.getItem(STORAGE_KEY) !== this.previous) throw new Error('Дані змінилися в іншій вкладці. Оновіть сторінку перед збереженням.')
    try {
      if (this.previous && JSON.parse(this.previous).version === 1) this.storage.setItem('dealpilot.backup.v1', this.previous)
      this.storage.setItem(STORAGE_KEY, raw)
    } catch { throw new Error('Не вдалося зберегти дані. Сховище недоступне або заповнене. Попередні дані не змінено; експортуйте резервну копію.') }
    this.previous = raw
    return validated
  }
}
