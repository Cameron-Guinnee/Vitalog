import { Activity, HeartPulse, Info, Scale, Smartphone, Watch, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

const INTEGRATIONS: { name: string; icon: LucideIcon; description: string }[] = [
  { name: 'Apple Health', icon: Smartphone, description: 'Steps, heart rate, sleep and workouts from your iPhone.' },
  { name: 'Google Fit', icon: HeartPulse, description: 'Activity and biometrics from Android and Wear OS.' },
  { name: 'Fitbit', icon: Activity, description: 'Steps, calories burned, sleep and heart rate from Fitbit devices.' },
  { name: 'Garmin Connect', icon: Watch, description: 'Workouts, GPS activities and biometrics from Garmin wearables.' },
  { name: 'Withings', icon: Scale, description: 'Weight and body composition from Withings smart scales.' },
]

/** Planned device integrations. None are live yet, so this says so plainly and points to manual logging. */
export function SyncDevice() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <p className="flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        Device sync is planned for a future update. None of these integrations are active yet.
      </p>

      <section aria-label="Planned integrations" className="rounded-xl bg-surface">
        <ul className="divide-y divide-border">
          {INTEGRATIONS.map(({ name, icon: Icon, description }) => (
            <li key={name} className="flex items-center gap-4 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-primary">
                <Icon size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted">{description}</span>
              </div>
              <span className="shrink-0 rounded-full bg-surface-raised px-2.5 py-1 text-xs text-muted">Coming soon</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Log it yourself" className="flex flex-col gap-2 rounded-xl bg-surface p-5 text-sm">
        <h2 className="font-medium">Log it yourself for now</h2>
        <p className="text-muted">
          Add weight, sleep, heart rate and other readings with <strong className="text-foreground">Biometric</strong> in the{' '}
          <Link to="/diary" className="text-primary hover:underline">
            diary
          </Link>
          , and workouts or steps with <strong className="text-foreground">Exercise</strong>.
        </p>
      </section>
    </div>
  )
}
