import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Select } from '../../components/ui/select'
import type { ActiveGroup } from '../profile/displaySettings'

type Props = { open: boolean; onClose: () => void; groups: ActiveGroup[]; onSave: (note: { content: string; group: number }) => Promise<void> }

export function NoteDialog({ open, onClose, groups, onSave }: Props) {
  const [content, setContent] = useState('')
  const [group, setGroup] = useState(groups[0]?.index ?? 0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function close() {
    setContent('')
    setError('')
    onClose()
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return setError('Write something first.')
    setSaving(true)
    try {
      await onSave({ content: content.trim(), group })
      close()
    } catch {
      setError('Couldn’t save the note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Add note">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Note" htmlFor="note-content">
          <textarea
            id="note-content"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus-visible:border-primary focus-visible:outline-none"
          />
        </Field>
        <Field label="Diary group" htmlFor="note-group">
          <Select id="note-group" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
            {groups.map((g) => (
              <option key={g.index} value={g.index}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save note'}
        </Button>
      </form>
    </Dialog>
  )
}
