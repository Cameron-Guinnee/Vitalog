import { useQuery } from '@tanstack/react-query'
import { Moon } from 'lucide-react'
import { Alert } from '../../../components/ui/alert'
import { dashboardKey, fetchSleep } from '../api'
import { Card, Empty, Stat } from '../Card'

const hoursAndMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`

export function SleepCard({ userId, today }: { userId: string; today: string }) {
  const sleep = useQuery({ queryKey: dashboardKey(userId, 'sleep', today), queryFn: () => fetchSleep(userId, today, 7) })
  const nights = sleep.data ?? []
  const average = nights.length ? nights.reduce((s, n) => s + n.duration_minutes, 0) / nights.length : 0

  return (
    <Card title="Sleep" icon={Moon}>
      {sleep.isError ? (
        <Alert tone="error">Couldn’t load your sleep.</Alert>
      ) : sleep.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : nights.length === 0 ? (
        <Empty>No sleep recorded this week. Sleep will come from connected devices in the mobile app.</Empty>
      ) : (
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Most recent" value={hoursAndMinutes(nights[0]!.duration_minutes)} />
          <Stat label="7-day average" value={hoursAndMinutes(average)} />
          <Stat label="Nights recorded" value={nights.length} />
        </dl>
      )}
    </Card>
  )
}
