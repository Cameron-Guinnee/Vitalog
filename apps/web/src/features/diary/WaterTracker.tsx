import { ML_PER_GLASS, NUTRIENT, mlTo, waterUnitLabel, type NutrientMap } from '@vitalog/shared'
import { Droplet, GlassWater } from 'lucide-react'
import { Progress } from '../../components/ui/progress'
import { cn } from '../../lib/utils'

const GLASSES_SHOWN = 8

/** Water from the day's food and drinks, against the goal in display settings. */
export function WaterTracker({ nutrients, unit, goalGlasses }: { nutrients: NutrientMap; unit: string; goalGlasses: number }) {
  const ml = nutrients[NUTRIENT.water] ?? 0
  const goalMl = goalGlasses * ML_PER_GLASS
  const pct = goalMl > 0 ? Math.min(100, (ml / goalMl) * 100) : 0
  const filled = Math.round((pct / 100) * GLASSES_SHOWN)

  return (
    <section aria-label="Water" className="flex flex-col gap-4 rounded-xl bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <Droplet size={16} className="text-primary" /> Water
        </h2>
        <span className="text-sm text-muted">
          {mlTo(unit, ml)} / {mlTo(unit, goalMl)} {waterUnitLabel(unit)}
        </span>
      </div>
      <div className="flex justify-between" aria-hidden="true">
        {Array.from({ length: GLASSES_SHOWN }, (_, i) => (
          <GlassWater key={i} size={22} className={cn(i < filled ? 'text-primary' : 'text-border')} />
        ))}
      </div>
      <Progress label="Water" value={ml} max={goalMl} />
      <p className="text-xs text-muted">{Math.round(pct)}% of your daily goal</p>
    </section>
  )
}
