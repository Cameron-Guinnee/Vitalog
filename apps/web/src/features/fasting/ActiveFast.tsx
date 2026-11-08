import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Progress } from '../../components/ui/progress'
import { formatElapsed, type Fast } from '../dashboard/stats'

/** Fasting targets in hours, with the usual eating-window names. */
export const FAST_TARGETS = [
  { hours: 12, label: '12:12' },
  { hours: 14, label: '14:10' },
  { hours: 16, label: '16:8' },
  { hours: 18, label: '18:6' },
  { hours: 20, label: '20:4' },
  { hours: 24, label: '24 hours' },
  { hours: 36, label: '36 hours' },
] as const

/** The current time, ticking every second. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** The running timer for a fast, measured against that fast's own target. */
export function ActiveFast({ fast, onEnd, ending }: { fast: Fast; onEnd: () => void; ending: boolean }) {
  const now = useNow()
  const elapsedMs = now - new Date(fast.startedAt).getTime()
  const targetHours = fast.targetHours ?? 16
  const targetMs = targetHours * 3_600_000
  const started = new Date(fast.startedAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-primary/10 p-4">
      <p className="text-3xl font-medium tabular-nums text-primary" aria-label="Time fasted">
        {formatElapsed(elapsedMs)}
      </p>
      <Progress value={elapsedMs} max={targetMs} label="Progress toward fasting target" />
      <p className="text-xs text-muted">
        {elapsedMs >= targetMs ? `Target of ${targetHours} hours reached` : `Target ${targetHours} hours`} · Started {started}
      </p>
      <Button variant="secondary" onClick={onEnd} disabled={ending}>
        End fast
      </Button>
    </div>
  )
}
