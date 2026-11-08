import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NUTRIENT, round1 } from '@vitalog/shared'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ConfirmDialog } from '../../components/ui/confirm'
import { Input } from '../../components/ui/input'
import { archiveCustomFood, foodsKey, listCustomFoods, saveCustomFood, type CustomFood } from '../../features/foods/api'
import { CustomFoodDialog } from '../../features/foods/CustomFoodDialog'

export function CustomFoods() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const key = foodsKey(userId, 'custom-foods')
  const foods = useQuery({ queryKey: key, queryFn: () => listCustomFoods(userId) })
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<CustomFood | 'new' | null>(null)
  const [removing, setRemoving] = useState<CustomFood | null>(null)
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['foods', userId] }), queryClient.invalidateQueries({ queryKey: ['stored-nutrients'] })])
  const save = useMutation({
    mutationFn: (f: Parameters<typeof saveCustomFood>[1]) => saveCustomFood(userId, f),
    onSuccess: async () => {
      await refresh()
      setEditing(null)
    },
  })

  const shown = (foods.data ?? []).filter((f) => `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase()))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input aria-label="Filter custom foods" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} /> New custom food
        </Button>
      </div>

      {foods.isError ? (
        <Alert tone="error">Couldn’t load your custom foods. Refresh to try again.</Alert>
      ) : foods.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : foods.data.length === 0 ? (
        <div className="rounded-xl bg-surface py-10 text-center text-sm text-muted">
          <p>No custom foods yet.</p>
          <p>Add foods that aren’t in the USDA database, straight from their nutrition label.</p>
        </div>
      ) : (
        <section aria-label="Custom foods" className="overflow-x-auto rounded-xl bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="px-5 py-3 font-medium">Food</th>
                <th scope="col" className="px-3 py-3 font-medium">Serving</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Calories</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Protein</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Carbs</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Fat</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((f) => (
                <tr key={f.id}>
                  <th scope="row" className="px-5 py-2.5 text-left font-normal">
                    <span className="block">{f.name}</span>
                    {f.brand && <span className="block text-xs text-muted">{f.brand}</span>}
                  </th>
                  <td className="px-3 py-2.5 text-muted">
                    {f.servingSize} {f.servingUnit}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{Math.round(f.nutrients[NUTRIENT.energy] ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{round1(f.nutrients[NUTRIENT.protein] ?? 0)} g</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{round1(f.nutrients[NUTRIENT.carbs] ?? 0)} g</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{round1(f.nutrients[NUTRIENT.fat] ?? 0)} g</td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label={`Edit ${f.name}`} onClick={() => setEditing(f)} className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground">
                        <Pencil size={15} />
                      </button>
                      <button type="button" aria-label={`Delete ${f.name}`} onClick={() => setRemoving(f)} className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-muted">
                    No custom foods match “{filter}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <CustomFoodDialog
        open={editing !== null}
        food={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={async (f) => {
          await save.mutateAsync(f)
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Delete custom food"
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await archiveCustomFood(removing!.id)
          await refresh()
          setRemoving(null)
        }}
      >
        <p>
          “{removing?.name}” will no longer show in search. Days you’ve already logged it on, and meals and recipes that use it, keep it.
        </p>
      </ConfirmDialog>
    </div>
  )
}
