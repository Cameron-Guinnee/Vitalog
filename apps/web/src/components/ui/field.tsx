import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type FieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
  className?: string
}

/** A labelled form row. Pass htmlFor when the child is a single input. */
export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
