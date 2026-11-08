import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted',
        'focus-visible:border-primary focus-visible:outline-none',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  )
}
