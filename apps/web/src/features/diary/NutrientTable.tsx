import { NUTRIENT_GROUPS, type NutrientMap } from '@vitalog/shared'
import { cn } from '../../lib/utils'

export function NutrientTable({ nutrients }: { nutrients: NutrientMap }) {
  return (
    <section aria-label="Nutrient targets" className="flex flex-col gap-4 rounded-xl bg-surface p-5">
      <h2 className="font-medium">Nutrient targets</h2>
      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {NUTRIENT_GROUPS.map((group) => (
          <table key={group.label} className="w-full text-sm">
            <caption className="mb-1 text-left text-xs font-medium tracking-wide text-muted uppercase">{group.label}</caption>
            <tbody>
              {group.nutrients.map((n) => {
                const value = nutrients[n.id] ?? 0
                const pct = n.dailyValue && value ? (value / n.dailyValue) * 100 : null
                return (
                  <tr key={n.id} className="h-7">
                    <th scope="row" className="w-2/5 text-left font-normal">
                      {n.name}
                    </th>
                    <td className="w-1/5 text-right tabular-nums">{value ? `${value.toFixed(1)} ${n.unit}` : '–'}</td>
                    <td className="px-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className={cn('h-full rounded-full', pct === null ? '' : pct >= 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-muted')}
                          style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="w-12 text-right text-xs text-muted tabular-nums">{pct === null ? (n.dailyValue ? '0%' : '') : `${Math.round(pct)}%`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  )
}
