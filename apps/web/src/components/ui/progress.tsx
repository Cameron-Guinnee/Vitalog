import { cn } from '../../lib/utils'

/** A thin progress bar. `value` and `max` are in the same unit; it caps at full. */
export function Progress({ value, max, className, label }: { value: number; max: number; className?: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(max)} className="h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div className={cn('h-full rounded-full bg-primary', className)} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** A ring gauge with a value in the middle. */
export function Ring({ value, max, color, children }: { value: number; max: number; color: string; children: React.ReactNode }) {
  const r = 42
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-border" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" stroke={color} strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
