import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { useProfile } from '../../features/profile/useProfile'
import { NothingToSnapshot, deleteSnapshot, fetchSnapshots, takeSnapshot, trendsKey } from '../../features/trends/api'
import { snapshotRows } from '../../features/trends/snapshots'

const longDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function Snapshots() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const { data: profile } = useProfile(userId)
  const units = profile?.units_preference === 'metric' ? 'metric' : 'imperial'
  const key = trendsKey(userId, 'snapshots')
  const snapshots = useQuery({ queryKey: key, queryFn: () => fetchSnapshots(userId) })
  const [note, setNote] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const take = useMutation({
    mutationFn: () => takeSnapshot(userId, note),
    onSuccess: () => setNote(''),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteSnapshot, onSettled: refresh })

  function submit(e: FormEvent) {
    e.preventDefault()
    take.mutate()
  }

  const list = snapshots.data ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-surface p-5">
        <p className="text-sm text-muted">Save the latest value of every biometric you’ve logged, so you can compare them later.</p>
        <Field label="Note (optional)" htmlFor="snapshot-note">
          <Input id="snapshot-note" value={note} maxLength={200} placeholder="Start of cut, end of bulk…" onChange={(e) => setNote(e.target.value)} />
        </Field>
        {take.isError && (
          <Alert tone="error">
            {take.error instanceof NothingToSnapshot ? 'Log a biometric first, then take a snapshot.' : 'Couldn’t save the snapshot. Please try again.'}
          </Alert>
        )}
        {take.isSuccess && <Alert tone="success">Snapshot saved with {take.data} {take.data === 1 ? 'measurement' : 'measurements'}.</Alert>}
        <Button type="submit" className="self-start" disabled={take.isPending}>
          <Camera size={16} /> {take.isPending ? 'Saving…' : 'Take snapshot'}
        </Button>
      </form>

      {snapshots.isError ? (
        <Alert tone="error">Couldn’t load your snapshots. Refresh to try again.</Alert>
      ) : snapshots.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No snapshots yet.</p>
      ) : (
        <>
          {remove.isError && <Alert tone="error">Couldn’t delete that snapshot. Please try again.</Alert>}
          <ul className="flex flex-col gap-3">
            {list.map((s, i) => {
              const rows = snapshotRows(s.metrics, list[i + 1]?.metrics ?? null, units)
              return (
                <li key={s.id}>
                  <section aria-label={`Snapshot from ${longDate(s.createdAt)}`} className="flex flex-col gap-3 rounded-xl bg-surface p-5">
                    <header className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-medium">{longDate(s.createdAt)}</h2>
                        {s.note && <p className="text-sm text-muted">{s.note}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove.mutate(s.id)}
                        disabled={remove.isPending}
                        aria-label={`Delete snapshot from ${longDate(s.createdAt)}`}
                        className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-danger"
                      >
                        <X size={16} />
                      </button>
                    </header>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {rows.map((r) => (
                        <div key={r.metric} className="flex flex-col gap-0.5">
                          <dt className="text-xs text-muted">{r.label}</dt>
                          <dd className="flex flex-col tabular-nums">
                            <span className="font-medium">
                              {r.value} {r.unit}
                            </span>
                            {r.change != null && r.change !== 0 && (
                              <span className="text-xs text-muted">
                                {r.change > 0 ? '+' : '−'}
                                {Math.abs(r.change)} since last
                              </span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
