import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

type Props = {
  title: string
  icon: LucideIcon
  /** Extra stats or options, shown when the card is expanded. */
  details?: ReactNode
  children: ReactNode
}

/** A dashboard card: a titled region with an optional expandable details section. */
export function Card({ title, icon: Icon, details, children }: Props) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl bg-surface p-5">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Icon size={18} className="text-primary" aria-hidden="true" />
          {title}
        </h3>
        {details && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={expanded ? `Hide ${title.toLowerCase()} details` : `Show ${title.toLowerCase()} details`}
            onClick={() => setExpanded((e) => !e)}
            className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-foreground"
          >
            <ChevronDown size={18} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </header>
      {children}
      {details && expanded && (
        <div id={detailsId} className="border-t border-border pt-3">
          {details}
        </div>
      )}
    </section>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>
}

/** A row of small pill buttons for picking one option, such as a date range. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            o.value === value ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-surface-raised hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
