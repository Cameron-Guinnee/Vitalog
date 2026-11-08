import { BIOMETRICS, type BiometricType, type Units } from '@vitalog/shared'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ChoiceGroup } from '../../components/ui/choice'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import type { ActiveGroup } from '../profile/displaySettings'

export type BiometricToSave = { readings: { metric: string; value: number; unit: string }[]; group: number; notes: string }

type Props = { open: boolean; onClose: () => void; units: Units; groups: ActiveGroup[]; onSave: (b: BiometricToSave) => Promise<void> }

function BiometricForm({ units, groups, onSave }: Pick<Props, 'units' | 'groups' | 'onSave'>) {
  const [metric, setMetric] = useState<BiometricType | ''>('')
  const [value, setValue] = useState('')
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [group, setGroup] = useState(groups[0]?.index ?? 0)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const info = BIOMETRICS.find((b) => b.value === metric)
  const unit = info?.unit(units) ?? ''

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!metric) return setError('Choose what you’re logging.')
    let readings: BiometricToSave['readings']
    if (metric === 'blood_pressure') {
      if (!(Number(systolic) > 0) || !(Number(diastolic) > 0)) return setError('Enter both blood pressure numbers.')
      readings = [
        { metric: 'blood_pressure_systolic', value: Number(systolic), unit },
        { metric: 'blood_pressure_diastolic', value: Number(diastolic), unit },
      ]
    } else {
      if (value.trim() === '' || !(Number(value) >= 0)) return setError('Enter a value.')
      readings = [{ metric, value: Number(value), unit }]
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ readings, group, notes: notes.trim() })
    } catch {
      setError('Couldn’t save this reading. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <ChoiceGroup
        label="Metric"
        columns={3}
        value={metric}
        onChange={(m) => {
          setMetric(m)
          setError('')
        }}
        options={BIOMETRICS.map((b) => ({ value: b.value, label: b.label, description: b.unit(units) }))}
      />
      {metric === 'blood_pressure' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Systolic (mmHg)" htmlFor="bp-sys">
            <Input id="bp-sys" type="number" min={0} placeholder="120" value={systolic} onChange={(e) => setSystolic(e.target.value)} />
          </Field>
          <Field label="Diastolic (mmHg)" htmlFor="bp-dia">
            <Input id="bp-dia" type="number" min={0} placeholder="80" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} />
          </Field>
        </div>
      ) : (
        info && (
          <Field label={`${info.label} (${unit})`} htmlFor="bio-value">
            <Input id="bio-value" type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )
      )}
      {metric && (
        <>
          <Field label="Diary group" htmlFor="bio-group">
            <Select id="bio-group" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
              {groups.map((g) => (
                <option key={g.index} value={g.index}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes (optional)" htmlFor="bio-notes">
            <Input id="bio-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Log reading'}
      </Button>
    </form>
  )
}

export function BiometricDialog({ open, onClose, units, groups, onSave }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Log biometric" className="max-w-xl">
      <BiometricForm
        units={units}
        groups={groups}
        onSave={async (b) => {
          await onSave(b)
          onClose()
        }}
      />
    </Dialog>
  )
}
