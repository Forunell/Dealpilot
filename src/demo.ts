import { type Database, type Contact, type Deal, STAGES, localDate, record, statusFor, emptyDatabase } from './domain'

export function demoDatabase(base = new Date()): Database {
  const shift = (days: number) => { const date = new Date(base); date.setDate(date.getDate() + days); return localDate(date) }
  const brands = ['Коло', 'Misto Coffee', 'Тиха хвиля', 'Forma Objects', 'Зелена кімната', 'Luma Studio', 'Папір & Лінія', 'Сонячний двір', 'Nori Market', 'Ранок', 'Теплий простір', 'Вільна полиця']
  const names = ['Олена Приклад', 'Марк Тестовий', 'Софія Демонстраційна', 'Данило Приклад', 'Анна Тестова', 'Назар Демонстраційний', 'Марта Приклад', 'Лев Тестовий', 'Ірина Демонстраційна', 'Роман Приклад', 'Єва Тестова', 'Тарас Демонстраційний']
  const contacts: Contact[] = brands.map((company, i) => ({ id: `demo-contact-${i}`, company, name: names[i], email: `hello${i + 1}@example.com`, phone: '', notes: 'Вигаданий контакт для демонстрації DealPilot.', demo: true }))
  const titles = ['Айдентика для Коло', 'Сайт кав’ярні', 'Паковання нової колекції', 'Каталог предметів', 'Інтернет-магазин рослин', 'Редизайн портфоліо', 'Брендбук видавництва', 'Лендинг простору', 'Дизайн застосунку', 'Візуальна система', 'Сайт студії інтер’єру', 'Дизайн книгарні', 'Сезонна кампанія', 'Меню та поліграфія', 'Сайт готелю', 'Предметна презентація', 'Паковання насіння', 'Соціальні мережі', 'Обкладинки серії', 'Навігація простору']
  const drafts = titles.map((title, i) => ({ id: `demo-deal-${i}`, title, contactId: contacts[i % 12].id, amount: [48000, 62000, 28000, 35000, 85000, 42000, 56000, 32000, 96000, 38000, 74000, 52000, 24000, 18000, 110000, 46000, 22000, 16000, 30000, 40000][i], currency: 'UAH', stage: STAGES[i % 5], expectedDate: shift(i * 2 - 4), probability: [15, 30, 55, 80, 100][i % 5], owner: ['Дизайн', 'Стратегія', 'Веб'][i % 3], notes: ['Обговорити цілі та зібрати референси.', 'Підготувати структуру й оцінку проєкту.', 'Уточнити обсяг робіт на наступній зустрічі.'][i % 3], demo: true }))
  const deals: Deal[] = drafts.map((d, i) => {
    const stage = i === 18 ? 'Втрачено' : d.stage
    const date = new Date(base); date.setMonth(date.getMonth() - Math.floor(i / 4)); date.setDate(Math.min(date.getDate(), 7))
    const created = new Date(date); created.setDate(created.getDate() - 5)
    return { ...d, currency: 'UAH', stage, status: statusFor(stage), createdAt: created.toISOString(), updatedAt: date.toISOString(), closedAt: statusFor(stage) === 'open' ? null : date.toISOString(), lostReason: stage === 'Втрачено' ? 'Демонстрація: змінилися пріоритети' : '' }
  })
  return record({ ...emptyDatabase(), contacts, deals, tasks: Array.from({ length: 9 }, (_, i) => ({ id: `demo-task-${i}`, title: ['Надіслати бриф', 'Уточнити обсяг робіт', 'Підготувати пропозицію', 'Зібрати референси', 'Узгодити наступний крок', 'Перевірити матеріали', 'Оновити кошторис', 'Підготувати презентацію', 'Занотувати підсумки'][i], dealId: deals[i].id, dueDate: shift(i < 3 ? 0 : i - 5), done: i === 8, demo: true, priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low', createdAt: base.toISOString(), completedAt: i === 8 ? base.toISOString() : null })), history: [] }, 'Завантажено демодані: 12 контактів, 20 угод і 9 завдань. Дати угод синтетичні.')
}
