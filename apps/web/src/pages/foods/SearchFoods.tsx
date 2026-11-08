import { nutrientsForAmount, servingOptionLabel, supports100g, toDayKey, type AmountUnit } from '@vitalog/shared'
import { useState } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { AddEntryDialogs } from '../../features/diary/AddEntryDialogs'
import { asFood, type FoodResult } from '../../features/diary/foodSearch'
import { NutrientTable } from '../../features/diary/NutrientTable'
import { FoodSearch } from '../../features/foods/FoodSearch'
import { NutritionTiles, useStoredNutrients } from '../../features/foods/nutrition'
import { activeDiaryGroups, displaySettingsFrom } from '../../features/profile/displaySettings'
import { useProfile } from '../../features/profile/useProfile'

function FoodDetail({ food, onLog }: { food: FoodResult; onLog: (quantity: number, unit: AmountUnit) => void }) {
  const info = asFood(food)
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<AmountUnit>('serving')
  const stored = useStoredNutrients([info])
  const qty = Number(quantity) > 0 ? Number(quantity) : null
  const amount = stored.data && qty ? nutrientsForAmount(info, stored.data.get(`${info.kind}:${info.id}`) ?? {}, qty, unit) : null

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={food.name} className="flex flex-col gap-4 rounded-xl bg-surface p-5">
        <div>
          <h2 className="text-lg font-medium">{food.name}</h2>
          <p className="text-sm text-muted">
            {[food.brand, food.kind === 'custom' ? 'Custom food' : food.kind === 'verified' ? 'USDA verified' : 'Branded'].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <Field label="Amount" htmlFor="sf-qty">
            <Input id="sf-qty" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit" htmlFor="sf-unit">
            <Select id="sf-unit" value={unit} onChange={(e) => setUnit(e.target.value as AmountUnit)}>
              <option value="serving">{servingOptionLabel(info)}</option>
              {supports100g(info) && <option value="100g">100 g</option>}
            </Select>
          </Field>
        </div>
        {stored.isError ? <Alert tone="error">Couldn’t load this food’s nutrients.</Alert> : <NutritionTiles nutrients={amount} />}
        <Button className="self-start" disabled={!qty} onClick={() => onLog(qty!, unit)}>
          Add to today’s diary
        </Button>
      </section>
      {amount && <NutrientTable nutrients={amount} title="Full nutrition" description="For the amount above, against daily values." />}
    </div>
  )
}

export function SearchFoods() {
  const userId = useUserId()
  const { data: profile } = useProfile(userId)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [logging, setLogging] = useState<{ quantity: number; unit: AmountUnit } | null>(null)
  const settings = displaySettingsFrom(profile?.display_settings)

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-4 lg:grid-cols-[22rem_1fr]">
      <div className="rounded-xl bg-surface p-5">
        <FoodSearch userId={userId} selected={selected} onSelect={setSelected} listClassName="max-h-[60vh]" />
      </div>
      {selected ? (
        <FoodDetail key={`${selected.kind}-${selected.id}`} food={selected} onLog={(quantity, unit) => setLogging({ quantity, unit })} />
      ) : (
        <p className="rounded-xl bg-surface p-10 text-center text-sm text-muted">Search for a food to see its full nutrition.</p>
      )}
      <AddEntryDialogs
        open={logging ? 'food' : null}
        onClose={() => setLogging(null)}
        userId={userId}
        day={toDayKey(new Date())}
        groups={activeDiaryGroups(settings)}
        units={profile?.units_preference === 'metric' ? 'metric' : 'imperial'}
        initialFood={selected && logging ? { type: 'food', food: selected, ...logging } : null}
      />
    </div>
  )
}
