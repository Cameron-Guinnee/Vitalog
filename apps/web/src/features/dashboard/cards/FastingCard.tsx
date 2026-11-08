import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hourglass } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { dashboardKey, endFast, fetchFasts, startFast } from '../api'
import { Card, Stat } from '../Card'
import { ActiveFast, FAST_TARGETS } from '../../fasting/ActiveFast'
import { fastStats, type Fast } from '../stats'

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
              {FAST_TARGETS.map((t) => (
                <option key={t.hours} value={t.hours}>
                  {t.hours} hours
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
