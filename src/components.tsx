import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import { contactSchema, dealSchema, taskSchema, STAGES, CURRENCIES, uid, localDate, statusFor, type Contact, type Deal, type Task, type Database } from './domain'

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; const trigger = document.activeElement as HTMLElement | null; dialog.showModal(); return () => { dialog.close(); trigger?.focus() } }, [])
  return <dialog ref={ref} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')]
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }} onCancel={event => { event.preventDefault(); close() }} aria-labelledby="dialog-title">
    <div className="modal-heading"><div><span className="eyebrow">DEALPILOT / РОБОЧИЙ ПРОСТІР</span><h2 id="dialog-title">{title}</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Закрити"><X size={20} /></button></div>
    {children}
  </dialog>
}
export type Editor = { kind: 'contact'; value?: Contact } | { kind: 'deal'; value?: Deal; stage?: Deal['stage'] } | { kind: 'task'; value?: Task }
export type SavedEntity = { kind: 'contact'; value: Contact } | { kind: 'deal'; value: Deal } | { kind: 'task'; value: Task }

export function EntityEditor({ editor, data, close, save, remove }: { editor: Editor; data: Database; close: () => void; save: (entity: SavedEntity) => boolean; remove: () => void }) {
  const [error, setError] = useState('')
  const titles = { contact: 'контакт', deal: 'угоду', task: 'завдання' }
  const value = editor.value
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const str = (name: string) => String(form.get(name) ?? '').trim()
    const common = { id: value?.id ?? uid(), demo: value?.demo ?? false }
    try {
      let entity: SavedEntity
      if (editor.kind === 'contact') entity = { kind: 'contact', value: contactSchema.parse({ ...common, name: str('name'), company: str('company'), email: str('email'), phone: str('phone'), notes: str('notes') }) }
      else if (editor.kind === 'deal') entity = { kind: 'deal', value: dealSchema.parse({ ...common, title: str('title'), contactId: str('contactId') || null, amount: Number(str('amount')), currency: str('currency'), stage: str('stage'), expectedDate: str('expectedDate'), probability: Number(str('probability')), owner: str('owner'), notes: str('notes'), createdAt: editor.value?.createdAt ?? null, updatedAt: editor.value?.updatedAt ?? null, closedAt: editor.value?.closedAt ?? null, status: statusFor(str('stage') as Deal['stage']), lostReason: str('lostReason') }) }
      else entity = { kind: 'task', value: taskSchema.parse({ ...common, title: str('title'), dealId: str('dealId') || null, dueDate: str('dueDate'), done: form.get('done') === 'on', priority: str('priority'), createdAt: editor.value ? editor.value.createdAt : new Date().toISOString(), completedAt: form.get('done') === 'on' ? editor.value?.done ? editor.value.completedAt : new Date().toISOString() : null }) }
      if (save(entity)) close()
      else setError('Зміни не збережено. Перевірте повідомлення про сховище на сторінці. Поля форми збережено.')
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) setError((error as { issues: { message: string }[] }).issues[0].message)
      else setError('Перевірте заповнені поля.')
    }
  }
  return <Modal title={`${value ? 'Редагувати' : 'Додати'} ${titles[editor.kind]}`} close={close}>
    <form onSubmit={submit} className="entity-form">
      <p className="form-hint">* Обов’язкові поля. Використовуйте лише вигадані дані.</p>
      {editor.kind === 'contact' && <>
        <label>Ім’я *<input name="name" defaultValue={editor.value?.name} required maxLength={160} autoFocus /></label>
        <label>Компанія<input name="company" defaultValue={editor.value?.company} maxLength={160} /></label>
        <div className="form-grid"><label>Email<input name="email" type="email" defaultValue={editor.value?.email} maxLength={254} placeholder="hello@example.com" /></label><label>Телефон<input name="phone" type="tel" defaultValue={editor.value?.phone} maxLength={30} placeholder="Необов’язково" /></label></div>
        <label>Нотатки<textarea name="notes" defaultValue={editor.value?.notes} maxLength={5000} rows={3} /></label>
      </>}
      {editor.kind === 'deal' && <>
        <label>Назва угоди *<input name="title" defaultValue={editor.value?.title} required maxLength={160} autoFocus /></label>
        <label>Клієнт<select aria-label="Клієнт" name="contactId" defaultValue={editor.value?.contactId ?? ''}><option value="">Без контакту</option>{data.contacts.map(c => <option key={c.id} value={c.id}>{c.company ? `${c.company} · ` : ''}{c.name}</option>)}</select></label>
        <div className="form-grid"><label>Сума *<input name="amount" type="number" min="0" max="1000000000" step="0.01" defaultValue={editor.value?.amount ?? ''} required /></label><label>Валюта<select aria-label="Валюта" name="currency" defaultValue={editor.value?.currency ?? 'UAH'}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label></div>
        <div className="form-grid"><label>Стадія<select aria-label="Стадія" name="stage" defaultValue={editor.value?.stage ?? editor.stage ?? STAGES[0]}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label><label>Очікувана дата<input name="expectedDate" type="date" min="1900-01-01" max="9999-12-31" defaultValue={editor.value?.expectedDate} /></label></div>
        <div className="form-grid"><label>Імовірність, % *<input name="probability" type="number" min="0" max="100" step="1" required defaultValue={editor.value?.probability ?? 50} /></label><label>Відповідальний · мітка<input name="owner" defaultValue={editor.value?.owner} maxLength={160} placeholder="Наприклад, дизайн" /></label></div>
        <label>Нотатки до угоди<textarea name="notes" rows={3} defaultValue={editor.value?.notes} maxLength={5000} placeholder="Домовленості, контекст і наступний крок…" /></label>
        <label>Причина втрати · необов’язково<input name="lostReason" defaultValue={editor.value?.lostReason} maxLength={1000} /></label>
        {editor.value && <section className="deal-context"><h3>Контекст угоди</h3><p>{data.contacts.find(c => c.id === editor.value?.contactId)?.name ?? 'Без контакту'} · {editor.value.closedAt ? `Закрито: ${new Date(editor.value.closedAt).toLocaleDateString('uk-UA')}` : 'Дата закриття не зафіксована'}</p><h4>Наступний крок та завдання</h4>{data.tasks.filter(t => t.dealId === editor.value?.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(t => <p key={t.id}>{t.done ? '✓' : '○'} {t.title} · {t.dueDate}</p>)}{!data.tasks.some(t => t.dealId === editor.value?.id) && <p>Пов’язаних завдань поки немає.</p>}<h4>Події угоди</h4>{data.history.filter(h => h.entityType === 'deal' && h.entityId === editor.value?.id).slice(0, 8).map(h => <p key={h.id}>{new Date(h.at).toLocaleString('uk-UA')} · {h.text}</p>)}{!data.history.some(h => h.entityType === 'deal' && h.entityId === editor.value?.id) && <p>Історія змін цієї угоди ще не записана.</p>}</section>}
      </>}
      {editor.kind === 'task' && <>
        <label>Назва завдання *<input name="title" defaultValue={editor.value?.title} maxLength={160} required autoFocus /></label>
        <label>Угода<select aria-label="Угода" name="dealId" defaultValue={editor.value?.dealId ?? ''}><option value="">Без угоди</option>{data.deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
        <label>Пріоритет<select aria-label="Пріоритет" name="priority" defaultValue={editor.value?.priority ?? 'medium'}><option value="low">Низький</option><option value="medium">Середній</option><option value="high">Високий</option></select></label>
        <label>Дата виконання *<input type="date" name="dueDate" min="1900-01-01" max="9999-12-31" defaultValue={editor.value?.dueDate ?? localDate()} required /></label>
        <label className="check-label"><input type="checkbox" name="done" defaultChecked={editor.value?.done} /> Виконано</label>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">{value && <button type="button" className="button danger ghost" onClick={remove}><Trash2 size={16} />Видалити</button>}<div className="action-spacer" /><button className="button secondary" type="button" onClick={close}>Скасувати</button><button className="button primary"><Save size={16} />Зберегти</button></div>
    </form>
  </Modal>
}
