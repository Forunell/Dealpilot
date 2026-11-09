import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Database } from './domain'
import type { Editor } from './components'

export default function GlobalSearch({ data, open }: { data: Database; open: (editor: Editor) => void }) {
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  const q = query.trim().toLocaleLowerCase('uk')
  const matches = (text: string) => text.toLocaleLowerCase('uk').includes(q)
  const results: { key: string; text: string; label: string; editor: Editor }[] = [
    ...data.deals.filter(d => { const c = data.contacts.find(c => c.id === d.contactId); return matches(`${d.title} ${c?.company ?? ''} ${c?.name ?? ''}`) }).map(value => ({ key: `d-${value.id}`, text: value.title, label: 'Угода', editor: { kind: 'deal' as const, value } })),
    ...data.contacts.filter(c => matches(`${c.name} ${c.company}`)).map(value => ({ key: `c-${value.id}`, text: value.company ? `${value.name} · ${value.company}` : value.name, label: 'Контакт', editor: { kind: 'contact' as const, value } })),
    ...data.tasks.filter(t => matches(t.title)).map(value => ({ key: `t-${value.id}`, text: value.title, label: 'Завдання', editor: { kind: 'task' as const, value } })),
  ]
  return <div className="global-search" onKeyDown={e => { if (e.key === 'Escape') setQuery('') }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setQuery('') }}><label><Search size={17} /><input ref={ref} aria-label="Глобальний пошук" placeholder="Пошук угод, контактів, завдань…" value={query} onChange={e => setQuery(e.target.value)} /><kbd>Ctrl K</kbd></label>{q && <div className="search-results"><div className="search-results-heading">Знайдено: {results.length}<button className="icon-button" aria-label="Закрити пошук" onClick={() => setQuery('')}><X size={16} /></button></div>{results.slice(0, 20).map(r => <button key={r.key} onClick={() => { setQuery(''); open(r.editor) }}><span>{r.text}</span><small>{r.label}</small></button>)}{!results.length && <p>Нічого не знайдено.</p>}{results.length > 20 && <p>Перші 20 результатів. Уточніть пошук.</p>}</div>}</div>
}
