import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hourglass } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { Progress } from '../../../components/ui/progress'
import { Select } from '../../../components/ui/select'
import { dashboardKey, endFast, fetchFasts, startFast } from '../api'
import { Card, Stat } from '../Card'
import { fastStats, formatElapsed, type Fast } from '../stats'

const TARGETS = [12, 14, 16, 18, 20, 24]

/** The current time, ticking every second. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function ActiveFast({ fast, onEnd, ending }: { fast: Fast; onEnd: () => void; ending: boolean }) {
  const now = useNow()
  const elapsedMs = now - new Date(fast.startedAt).getTime()
  const targetMs = (fast.targetHours ?? 16) * 3_600_000
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-primary/10 p-4">
      <p className="text-3xl font-medium tabular-nums text-primary" aria-label="Time fasted">
        {formatElapsed(elapsedMs)}
      </p>
      <Progress value={elapsedMs} max={targetMs} label="Progress toward fasting target" />
      <p className="text-xs text-muted">
        {elapsedMs >= targetMs ? `Target of ${fast.targetHours} hours reached` : `Target ${fast.targetHours} hours`}
      </p>
      <Button variant="secondary" onClick={onEnd} disabled={ending}>
        End fast
      </Button>
    </div>
  )
}

export function FastingCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const key = dashboardKey(userId, 'fasts')
  const fasts = useQuery({ queryKey: key, queryFn: () => fetchFasts(userId) })
  const [target, setTarget] = useState(16)
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const start = useMutation({ mutationFn: () => startFast(userId, target), onSettled: refresh })
  const end = useMutation({ mutationFn: (f: Fast) => endFast(f), onSettled: refresh })
  const stats = fastStats(fasts.data?.finished ?? [])
  const hours = (h: number) => `${h} ${h === 1 ? 'hour' : 'hours'}`

  return (
    <Card
      title="Fasting"
      icon={Hourglass}
      details={
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Finished fasts" value={stats.count} />
          <Stat label="Longest fast" value={hours(stats.longestHours)} />
          <Stat label="Total time fasting" value={hours(stats.totalHours)} />
          <Stat label="Last 7 average" value={hours(stats.recentAverageHours)} />
        </dl>
      }
    >
      {fasts.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : fasts.isError ? (
        <Alert tone="error">Couldn’t load your fasts.</Alert>
      ) : fasts.data.active ? (
        <ActiveFast fast={fasts.data.active} onEnd={() => end.mutate(fasts.data.active!)} ending={end.isPending} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{stats.count ? 'No fast in progress.' : 'No fasts yet. Start one now.'}</p>
          <div className="flex items-center gap-2">
            <Select aria-label="Fasting target" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-32">
              {TARGETS.map((t) => (
                <option key={t} value={t}>
                  {t} hours
                </option>
              ))}
            </Select>
            <Button onClick={() => start.mutate()} disabled={start.isPending}>
              Start fast
            </Button>
          </div>
        </div>
      )}
      {(start.isError || end.isError) && <Alert tone="error">Couldn’t save that. Please try again.</Alert>}
    </Card>
  )
}
