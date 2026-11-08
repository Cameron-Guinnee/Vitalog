import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'
import { searchFoods, type FoodFilter, type FoodResult } from '../diary/foodSearch'

const FILTERS: { value: FoodFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'branded', label: 'Branded' },
  { value: 'custom', label: 'Custom' },
]

export const KIND_STYLE = { custom: 'text-[#f0a500]', verified: 'text-success', branded: 'text-primary' }

type Props = {
  userId: string
  onSelect: (food: FoodResult) => void
  selected?: FoodResult | null
  /** Shown before anything has been searched. */
  idle?: React.ReactNode
  listClassName?: string
}

/** Search box, filters and results for USDA and custom foods. */
export function FoodSearch({ userId, onSelect, selected, idle, listClassName }: Props) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [filter, setFilter] = useState<FoodFilter>('all')
  const results = useQuery({
    queryKey: ['food-search', userId, submitted, filter],
    queryFn: () => searchFoods(userId, submitted, filter),
    enabled: submitted.trim().length > 0,
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(text)
        }}
      >
        <Input aria-label="Search foods" placeholder="Search foods…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit">
          <Search size={16} /> Search
        </Button>
      </form>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter results">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn('rounded-full border px-3 py-1 text-xs', filter === f.value ? 'border-primary text-primary' : 'border-border text-muted hover:text-foreground')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={cn('max-h-64 overflow-y-auto rounded-lg border border-border', listClassName)}>
        {!submitted.trim() ? (
          (idle ?? <p className="p-4 text-sm text-muted">Search the USDA database and your custom foods.</p>)
        ) : results.isPending ? (
          <p className="p-4 text-sm text-muted">Searching…</p>
        ) : results.isError ? (
          <p className="p-4 text-sm text-danger">Search failed. Please try again.</p>
        ) : results.data.length === 0 ? (
          <p className="p-4 text-sm text-muted">No foods match “{submitted}”.</p>
        ) : (
          <ul aria-label="Search results" className="divide-y divide-border">
            {results.data.map((f) => {
              const isSelected = selected?.id === f.id && selected.kind === f.kind
              return (
                <li key={`${f.kind}-${f.id}`}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(f)}
                    className={cn('flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-surface-raised', isSelected && 'bg-primary/10')}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{f.name}</span>
                      {f.brand && <span className="truncate text-xs text-muted">{f.brand}</span>}
                    </span>
                    <span className={cn('shrink-0 text-xs capitalize', KIND_STYLE[f.kind])}>{f.kind}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
