import type { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { shortDay } from './stats'

// Shared styling so every chart reads as one system: recessive grid and axes, ink-coloured text.
export const SERIES = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)', 'var(--color-series-4)'] as const
export const axisProps = {
  stroke: 'var(--color-border)',
  tick: { fill: 'var(--color-muted)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const
export const gridProps = { stroke: 'var(--color-border)', strokeDasharray: '3 3', vertical: false } as const
export const tooltipProps = {
  contentStyle: { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--color-foreground)', marginBottom: 4 },
  itemStyle: { color: 'var(--color-foreground)', padding: 0 },
  labelFormatter: (day: unknown) => (typeof day === 'string' ? shortDay(day) : String(day)),
} as const

/** A fixed-height, full-width chart area. `summary` is read to screen readers in place of the chart. */
export function ChartFrame({ summary, children, height = 180 }: { summary: string; children: ReactNode; height?: number }) {
  return (
    <figure className="m-0">
      <div aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0.5 w-3 rounded-full"
            style={i.dashed ? { borderTop: `2px dashed ${i.color}` } : { background: i.color, height: 8, width: 8, borderRadius: 2 }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
