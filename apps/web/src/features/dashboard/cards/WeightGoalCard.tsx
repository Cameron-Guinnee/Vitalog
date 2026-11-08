import { useQuery } from '@tanstack/react-query'
import { WEIGHT_GOAL_TYPES, round1, type Tables, type Units } from '@vitalog/shared'
import { Target } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Progress } from '../../../components/ui/progress'
import { dashboardKey, fetchWeightEnds } from '../api'
import { Card, Stat } from '../Card'
import { weightSeries } from '../stats'

type Props = { userId: string; units: Units; profile: Tables<'profiles'>; onLogWeight: () => void }

export function WeightGoalCard({ userId, units, profile, onLogWeight }: Props) {
  const ends = useQuery({ queryKey: dashboardKey(userId, 'weight-ends'), queryFn: () => fetchWeightEnds(userId) })
  const unit = units === 'imperial' ? 'lbs' : 'kg'
  // Weigh-ins keep the unit they were logged in; show them in the user's units.
  const toUnits = (r: { loggedAt: string; value: number; unit: string } | null | undefined) => (r ? weightSeries([r], units)[0]!.value : null)
  const current = toUnits(ends.data?.latest)
  const start = toUnits(ends.data?.first)
  const goalType = profile.weight_goal_type ?? 'maintain'
  const goal = profile.weight_goal
  const goalLabel = WEIGHT_GOAL_TYPES.find((g) => g.value === goalType)?.label ?? 'Maintain weight'

  const toGo = current != null && goal != null ? round1(Math.abs(goal - current)) : null
  const reached = current != null && goal != null && (goalType === 'lose' ? current <= goal : goalType === 'gain' ? current >= goal : false)
  const progress = start != null && current != null && goal != null && start !== goal ? (current - start) / (goal - start) : 0

  return (
    <Card title="Weight goal" icon={Target}>
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Goal" value={goalLabel} />
        <Stat label="Goal weight" value={goal != null ? `${round1(goal)} ${unit}` : '—'} />
        <Stat label="Current" value={current != null ? `${current} ${unit}` : '—'} />
      </dl>
      {goalType !== 'maintain' && toGo != null && (
        <div className="flex flex-col gap-1.5">
          <Progress value={Math.max(0, progress)} max={1} label="Progress toward weight goal" className="bg-success" />
          <p className="text-xs text-muted">{reached ? 'Goal reached. Nice work!' : `${toGo} ${unit} to go`}</p>
        </div>
      )}
      <Button variant="secondary" className="self-start" onClick={onLogWeight}>
        Log weight
      </Button>
    </Card>
  )
}
