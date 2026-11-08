import { useState, type ReactNode } from 'react'
import { Alert } from './alert'
import { Button } from './button'
import { Dialog } from './dialog'

type Props = {
  open: boolean
  title: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => Promise<void>
  children: ReactNode
}

/** Asks before something that can't be undone from the screen, such as removing a saved item. */
export function ConfirmDialog({ open, title, confirmLabel, onCancel, onConfirm, children }: Props) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setBusy(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setFailed(false)
        onCancel()
      }}
      title={title}
    >
      <div className="text-sm text-muted">{children}</div>
      {failed && <Alert tone="error">That didn’t work. Please try again.</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={busy} className="bg-danger text-white hover:bg-danger/90">
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
