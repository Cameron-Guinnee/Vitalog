import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { Alert } from '../../../components/ui/alert'
import { dashboardKey, fetchStreaks } from '../api'
import { Card, Stat } from '../Card'
import { streaks } from '../stats'

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

export function StreaksCard({ userId, today }: { userId: string; today: string }) {
  const query = useQuery({ queryKey: dashboardKey(userId, 'streaks', today), queryFn: () => fetchStreaks(userId, today) })
  const s = query.data ? streaks(query.data.loggedDays, today) : null
  const loggedToday = query.data?.loggedDays.includes(today) ?? false

  return (
    <Card
      title="Streaks"
      icon={Award}
      details={
        query.data && (
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Foods logged" value={query.data.totals.foods} />
            <Stat label="Exercises logged" value={query.data.totals.exercises} />
            <Stat label="Biometrics logged" value={query.data.totals.biometrics} />
          </dl>
        )
      }
    >
      {query.isError ? (
        <Alert tone="error">Couldn’t load your streaks.</Alert>
      ) : !s || !query.data ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Current streak" value={days(s.current)} />
            <Stat label="Longest streak" value={days(Math.max(s.longest, query.data.savedLongest))} />
          </dl>
          <p className="text-xs text-muted">
            {loggedToday ? 'You’ve logged today. Keep it going!' : s.current > 0 ? 'Log something today to keep your streak.' : 'Log something today to start a streak.'}
          </p>
        </>
      )}
    </Card>
  )
}
