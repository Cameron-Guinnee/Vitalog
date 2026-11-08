import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Alert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('text-sm', tone === 'error' ? 'text-danger' : 'text-success')}
    >
      {children}
    </p>
  )
}
