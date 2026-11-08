import { cn } from '../../lib/utils'

type Option<T extends string> = { value: T; label: string; description?: string }

type ChoiceGroupProps<T extends string> = {
  label: string
  options: readonly Option<T>[]
  value: T | ''
  onChange: (value: T) => void
  columns?: 1 | 2 | 3
}

/** A set of toggle buttons that behaves like a radio group. */
export function ChoiceGroup<T extends string>({ label, options, value, onChange, columns = 2 }: ChoiceGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2', { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns])}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors',
              selected ? 'border-primary bg-primary/10' : 'border-border hover:border-muted',
            )}
          >
            <span className="font-medium">{o.label}</span>
            {o.description && <span className="text-xs text-muted">{o.description}</span>}
          </button>
        )
      })}
    </div>
  )
}
