import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ChoiceGroup } from '../../components/ui/choice'
import { ConfirmDialog } from '../../components/ui/confirm'
import { Stat } from '../../features/dashboard/Card'
import { dashboardKey, deleteFast, endFast, fetchFasts, startFast } from '../../features/dashboard/api'
import { fastStats, type Fast } from '../../features/dashboard/stats'
import { ActiveFast, FAST_TARGETS } from '../../features/fasting/ActiveFast'

const HISTORY_SHOWN = 10

/** "16h 5m", or "45m" under an hour. */
export function durationText(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function Fasting() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  // The same query as the dashboard's fasting card, so the two stay in step.
  const key = dashboardKey(userId, 'fasts')
  const fasts = useQuery({ queryKey: key, queryFn: () => fetchFasts(userId) })
  const [target, setTarget] = useState('16')
  const [showAll, setShowAll] = useState(false)
  const [removing, setRemoving] = useState<Fast | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const start = useMutation({ mutationFn: () => startFast(userId, Number(target)), onSettled: refresh })
  const end = useMutation({ mutationFn: (f: Fast) => endFast(f), onSettled: refresh })

  if (fasts.isError) return <Alert tone="error">Couldn’t load your fasts. Refresh to try again.</Alert>
  if (fasts.isPending) return <p className="text-sm text-muted">Loading…</p>

  const { active, finished } = fasts.data
  const stats = fastStats(finished)
  const hours = (h: number) => `${h} ${h === 1 ? 'hour' : 'hours'}`
  const shown = showAll ? finished : finished.slice(0, HISTORY_SHOWN)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <section aria-label={active ? 'Fast in progress' : 'Start a fast'} className="flex flex-col gap-4 rounded-xl bg-surface p-5">
        <h2 className="font-medium">{active ? 'Fast in progress' : 'Start a fast'}</h2>
        {active ? (
          <ActiveFast fast={active} onEnd={() => end.mutate(active)} ending={end.isPending} />
        ) : (
          <>
            <ChoiceGroup
              label="Fasting target"
              columns={3}
              value={target}
              onChange={setTarget}
              options={FAST_TARGETS.map((t) => ({ value: String(t.hours), label: t.label, description: `${t.hours} hours` }))}
            />
            <Button onClick={() => start.mutate()} disabled={start.isPending} className="self-start">
              Start {target}-hour fast
            </Button>
          </>
        )}
        {(start.isError || end.isError) && <Alert tone="error">Couldn’t save that. Please try again.</Alert>}
      </section>

      <section aria-label="Fasting stats" className="rounded-xl bg-surface p-5">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Finished fasts" value={stats.count} />
          <Stat label="Longest fast" value={hours(stats.longestHours)} />
          <Stat label="Total time fasting" value={hours(stats.totalHours)} />
          <Stat label="Last 7 average" value={hours(stats.recentAverageHours)} />
        </dl>
      </section>

      <section aria-label="History" className="flex flex-col gap-3 rounded-xl bg-surface p-5">
        <h2 className="font-medium">History</h2>
        {finished.length === 0 ? (
          <p className="text-sm text-muted">No finished fasts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((f) => {
              const ms = new Date(f.endedAt!).getTime() - new Date(f.startedAt).getTime()
              const reached = f.targetHours != null && ms >= f.targetHours * 3_600_000
              return (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-medium tabular-nums">
                      {durationText(ms)}
                      {reached && <CircleCheck size={14} className="text-success" aria-label="Target reached" />}
                    </span>
                    <span className="text-xs text-muted">
                      {when(f.startedAt)}
                      {f.targetHours != null && ` · Target ${f.targetHours} hours`}
                    </span>
                  </div>
                  <Button variant="ghost" aria-label={`Delete the fast from ${when(f.startedAt)}`} onClick={() => setRemoving(f)}>
                    <Trash2 size={16} />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {finished.length > HISTORY_SHOWN && (
          <Button variant="ghost" className="self-start" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `Show all ${finished.length}`}
          </Button>
        )}
      </section>

      <ConfirmDialog
        open={!!removing}
        title="Delete this fast?"
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await deleteFast(removing!.id)
          await refresh()
          setRemoving(null)
        }}
      >
        {removing && `The ${durationText(new Date(removing.endedAt!).getTime() - new Date(removing.startedAt).getTime())} fast from ${when(removing.startedAt)} will be removed from your history and stats.`}
      </ConfirmDialog>
    </div>
  )
}
