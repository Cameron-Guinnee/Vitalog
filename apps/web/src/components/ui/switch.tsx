import { useId } from 'react'
import { cn } from '../../lib/utils'

type Props = { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }

/** An on/off setting: its label on the left and the switch on the right. */
export function SwitchRow({ label, description, checked, onChange }: Props) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex flex-col">
        <span id={id} className="text-sm">
          {label}
        </span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}
