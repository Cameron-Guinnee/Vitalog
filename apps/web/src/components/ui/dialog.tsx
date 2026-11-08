import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

/** A modal dialog: closes on Escape or a click outside, and returns focus when it closes. */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  // Held in a ref so a new onClose each render doesn't re-run the effect and steal focus.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    // Focus the first field, or the panel itself if there isn't one.
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea')
    ;(first ?? panel.current)?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('flex w-full max-w-lg flex-col gap-4 rounded-xl border border-border bg-surface p-6 outline-none', className)}
      >
        <header className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-foreground">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  )
}
