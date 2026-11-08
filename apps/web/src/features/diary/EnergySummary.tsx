import { NUTRIENT, macroGoals, round1, type NutrientMap } from '@vitalog/shared'
import { Progress, Ring } from '../../components/ui/progress'

type Props = { nutrients: NutrientMap; calorieGoal: number; caloriesBurned: number }

export function EnergySummary({ nutrients, calorieGoal, caloriesBurned }: Props) {
  const consumed = Math.round(nutrients[NUTRIENT.energy] ?? 0)
  const remaining = Math.max(0, calorieGoal - consumed + caloriesBurned)
  const goals = macroGoals(calorieGoal)
  const macros = [
    { label: 'Protein', value: round1(nutrients[NUTRIENT.protein] ?? 0), goal: goals.protein, color: 'bg-success' },
    { label: 'Carbs', value: round1(nutrients[NUTRIENT.carbs] ?? 0), goal: goals.carbs, color: 'bg-primary' },
    { label: 'Fat', value: round1(nutrients[NUTRIENT.fat] ?? 0), goal: goals.fat, color: 'bg-danger' },
  ]
  const rings = [
    { label: 'Consumed', value: consumed, color: 'var(--color-primary)' },
    { label: 'Burned', value: caloriesBurned, color: 'var(--color-success)' },
    { label: 'Remaining', value: remaining, color: '#f0a500' },
  ]

  return (
    <section aria-label="Energy summary" className="flex flex-col gap-5 rounded-xl bg-surface p-5">
      <div className="flex flex-wrap justify-around gap-4">
        {rings.map((r) => (
          <div key={r.label} className="flex flex-col items-center gap-2">
            <Ring value={r.value} max={calorieGoal} color={r.color}>
              <span className="text-xl font-semibold">{r.value}</span>
              <span className="text-xs text-muted">kcal</span>
            </Ring>
            <span className="text-sm text-muted">{r.label}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span>Energy</span>
            <span className="text-muted">
              {consumed} / {calorieGoal} kcal
            </span>
          </div>
          <Progress label="Energy" value={consumed} max={calorieGoal} />
        </div>
        {macros.map((m) => (
          <div key={m.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span>{m.label}</span>
              <span className="text-muted">
                {m.value} / {m.goal} g
              </span>
            </div>
            <Progress label={m.label} value={m.value} max={m.goal} className={m.color} />
          </div>
        ))}
      </div>
    </section>
  )
}
