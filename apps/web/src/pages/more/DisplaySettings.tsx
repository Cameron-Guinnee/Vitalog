import { useQueryClient } from '@tanstack/react-query'
import { ML_PER_GLASS, mlTo, waterUnitLabel, type Json } from '@vitalog/shared'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ChoiceGroup } from '../../components/ui/choice'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { SwitchRow } from '../../components/ui/switch'
import { displaySettingsFrom, type DisplaySettings as Settings } from '../../features/profile/displaySettings'
import { profileQueryKey, useProfile } from '../../features/profile/useProfile'
import { supabase } from '../../lib/supabase'

type CardKey = 'show_fasting' | 'show_weight_goal' | 'show_energy_consumed' | 'show_energy_history' | 'show_weight_change' | 'show_sleep' | 'show_streaks' | 'show_weight'

// In the order the cards appear on the dashboard.
const DASHBOARD_CARDS: { key: CardKey; label: string }[] = [
  { key: 'show_fasting', label: 'Fasting' },
  { key: 'show_weight_goal', label: 'Weight goal' },
  { key: 'show_energy_consumed', label: 'Energy consumed' },
  { key: 'show_energy_history', label: 'Energy history' },
  { key: 'show_weight_change', label: 'Weight change' },
  { key: 'show_sleep', label: 'Sleep' },
  { key: 'show_streaks', label: 'Streaks' },
  { key: 'show_weight', label: 'Biometrics' },
]

const WATER_UNITS = [
  { value: 'fl_oz', label: 'fl oz' },
  { value: 'ml', label: 'mL' },
  { value: 'cups', label: 'Cups' },
]

const GLASS_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 4)

/** The diary needs at least one group to file entries under, and every shown group needs a name. */
export function validateSettings(s: Settings): string | null {
  if (s.show_diary_groups) {
    if (!s.diary_groups.some((g) => g.enabled)) return 'Turn on at least one diary group, or turn off diary groups.'
    if (s.diary_groups.some((g) => g.enabled && !g.name.trim())) return 'Give every diary group you turn on a name.'
  }
  return null
}

/** What gets stored: the edited settings over whatever was saved before, so keys this screen doesn't show are kept. */
export function settingsToSave(stored: Json | null | undefined, s: Settings): Json {
  const saved = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  return { ...saved, ...s, diary_groups: s.diary_groups.map((g) => ({ enabled: g.enabled, name: g.name.trim() })) } as Json
}

export function DisplaySettings() {
  const userId = useUserId()
  const profile = useProfile(userId)
  if (profile.isError) return <Alert tone="error">Couldn’t load your settings. Refresh to try again.</Alert>
  if (!profile.data) return <p className="text-sm text-muted">Loading…</p>
  return <SettingsEditor userId={userId} stored={profile.data.display_settings} />
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function SettingsEditor({ userId, stored }: { userId: string; stored: Json | null }) {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState(() => displaySettingsFrom(stored))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSuccess('')
    setSettings((s) => ({ ...s, [key]: value }))
  }

  function setGroup(index: number, patch: Partial<Settings['diary_groups'][number]>) {
    set(
      'diary_groups',
      settings.diary_groups.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    )
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSuccess('')
    const problem = validateSettings(settings)
    setError(problem ?? '')
    if (problem) return
    setSaving(true)
    try {
      const { error: saveError } = await supabase
        .from('profiles')
        .update({ display_settings: settingsToSave(stored, settings), updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (saveError) throw saveError
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) })
      setSuccess('Your display settings are saved.')
    } catch (err) {
      console.error(err)
      setError('Couldn’t save your settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const glassAmount = (glasses: number) => `${mlTo(settings.water_unit, glasses * ML_PER_GLASS)} ${waterUnitLabel(settings.water_unit)}`

  return (
    <form onSubmit={save} noValidate className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Section title="Dashboard" description="Choose which cards show on your dashboard.">
        <div className="divide-y divide-border">
          {DASHBOARD_CARDS.map((c) => (
            <SwitchRow key={c.key} label={c.label} checked={settings[c.key]} onChange={(v) => set(c.key, v)} />
          ))}
        </div>
      </Section>

      <Section title="Diary">
        <div className="divide-y divide-border">
          <SwitchRow
            label="Energy summary"
            description="Calories eaten, burned and remaining, at the top of the diary."
            checked={settings.show_energy_summary}
            onChange={(v) => set('show_energy_summary', v)}
          />
          <SwitchRow label="Water" description="The water tracker beside the energy summary." checked={settings.show_water_widget} onChange={(v) => set('show_water_widget', v)} />
          <SwitchRow
            label="Diary groups"
            description="Split the diary into the groups below. When off, everything is listed together."
            checked={settings.show_diary_groups}
            onChange={(v) => set('show_diary_groups', v)}
          />
        </div>
      </Section>

      <Section title="Water">
        <Field label="Units">
          <ChoiceGroup label="Water units" columns={3} value={settings.water_unit} onChange={(v) => set('water_unit', v)} options={WATER_UNITS} />
        </Field>
        <Field label="Daily goal" htmlFor="waterGoal" hint="A glass is 240 mL (about 8 fl oz).">
          <Select id="waterGoal" value={settings.water_goal_glasses} onChange={(e) => set('water_goal_glasses', Number(e.target.value))} className="sm:w-64">
            {[...new Set([...GLASS_OPTIONS, settings.water_goal_glasses])]
              .sort((a, b) => a - b)
              .map((g) => (
                <option key={g} value={g}>
                  {g} glasses ({glassAmount(g)})
                </option>
              ))}
          </Select>
        </Field>
      </Section>

      {settings.show_diary_groups && (
        <Section title="Diary groups" description="Turn groups on and rename them. Entries in a group you turn off show in the first group that's on.">
          <ol className="grid gap-3 sm:grid-cols-2">
            {settings.diary_groups.map((g, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Show group ${i + 1}`}
                  checked={g.enabled}
                  onChange={(e) => setGroup(i, { enabled: e.target.checked })}
                  className="size-4 accent-[var(--color-primary)]"
                />
                <Input aria-label={`Group ${i + 1} name`} value={g.name} maxLength={40} onChange={(e) => setGroup(i, { name: e.target.value })} disabled={!g.enabled} />
              </li>
            ))}
          </ol>
        </Section>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <Button type="submit" disabled={saving} className="self-end">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
