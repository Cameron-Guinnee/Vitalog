import { amountText } from '@vitalog/shared'
import { Activity, Apple, ChevronDown, Dumbbell, StickyNote, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import type { DiaryEntry } from './api'

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function EntryRow({ entry, onDelete }: { entry: DiaryEntry; onDelete: () => void }) {
  let icon, title, detail, amount
  switch (entry.type) {
    case 'food':
      icon = <Apple size={16} className="text-success" />
      title = entry.name
      detail = amountText(entry.quantity, entry.servingUnit)
      amount = (
        <>
          <span>{entry.calories} kcal</span>
          <span className="text-xs text-muted">
            P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g
          </span>
        </>
      )
      break
    case 'biometric':
      icon = <Activity size={16} className="text-primary" />
      title = titleCase(entry.metric)
      detail = entry.notes
      amount = (
        <span>
          {entry.value} {entry.unit}
        </span>
      )
      break
    case 'exercise':
      icon = <Dumbbell size={16} className="text-[#f0a500]" />
      title = entry.name
      detail = `${entry.minutes} min`
      amount = entry.caloriesBurned ? <span>−{Math.round(entry.caloriesBurned)} kcal</span> : null
      break
    case 'note':
      icon = <StickyNote size={16} className="text-muted" />
      title = entry.content
      break
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('text-sm', entry.type === 'note' ? 'whitespace-pre-wrap' : 'truncate')}>{title}</span>
        {detail && <span className="truncate text-xs text-muted">{detail}</span>}
      </div>
      {amount && <div className="flex shrink-0 flex-col items-end text-sm">{amount}</div>}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${entry.type === 'note' ? 'note' : title}`}
        className="rounded-md p-1 text-muted opacity-60 hover:bg-surface-raised hover:text-danger group-hover:opacity-100"
      >
        <X size={16} />
      </button>
    </li>
  )
}

export function MealSection({ title, entries, onDelete }: { title: string; entries: DiaryEntry[]; onDelete: (e: DiaryEntry) => void }) {
  const [open, setOpen] = useState(true)
  const calories = entries.reduce((sum, e) => sum + (e.type === 'food' ? e.calories : 0), 0)

  return (
    <section aria-label={title} className="overflow-hidden rounded-xl bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-3 text-sm text-muted">
          {calories > 0 && `${calories} kcal`}
          <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open &&
        (entries.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {entries.map((e) => (
              <EntryRow key={`${e.type}-${e.id}`} entry={e} onDelete={() => onDelete(e)} />
            ))}
          </ul>
        ) : (
          <p className="border-t border-border px-4 py-3 text-sm text-muted">Nothing logged yet.</p>
        ))}
    </section>
  )
}
