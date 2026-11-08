import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { amountText, amountUnitLabel, multiplyNutrients } from '@vitalog/shared'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ConfirmDialog } from '../../components/ui/confirm'
import { foodsKey, type Portion } from './api'
import { NutritionTiles, usePortionTotals } from './nutrition'
import { PortionEditor, type PortionListInput } from './PortionEditor'

export type PortionList = { id: string; name: string; servings?: number; items: Portion[] }

type Props<T extends PortionList> = {
  kind: 'meal' | 'recipe'
  list: (userId: string) => Promise<T[]>
  save: (userId: string, input: PortionListInput & { id?: string }, previousItemIds: string[]) => Promise<string>
  remove: (id: string) => Promise<void>
  intro: string
  removeNote: string
}

function ListCard({ item, kind, onEdit, onDelete }: { item: PortionList; kind: 'meal' | 'recipe'; onEdit: () => void; onDelete: () => void }) {
  const { totals } = usePortionTotals(item.items)
  const per = kind === 'recipe' && totals ? multiplyNutrients(totals, 1 / (item.servings ?? 1)) : totals
  return (
    <li>
      <section aria-label={item.name} className="flex flex-col gap-3 rounded-xl bg-surface p-5">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-medium">{item.name}</h2>
            <p className="text-xs text-muted">
              {kind === 'recipe' ? `Makes ${item.servings} ${item.servings === 1 ? 'serving' : 'servings'} · ` : ''}
              {item.items.length} {kind === 'meal' ? (item.items.length === 1 ? 'food' : 'foods') : item.items.length === 1 ? 'ingredient' : 'ingredients'}
            </p>
          </div>
          <div className="flex gap-1">
            <button type="button" aria-label={`Edit ${item.name}`} onClick={onEdit} className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground">
              <Pencil size={15} />
            </button>
            <button type="button" aria-label={`Delete ${item.name}`} onClick={onDelete} className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-danger">
              <Trash2 size={15} />
            </button>
          </div>
        </header>
        <ul className="flex flex-col gap-0.5 text-sm">
          {item.items.map((p) => (
            <li key={p.id} className="flex justify-between gap-3">
              <span className="truncate">{p.food.name}</span>
              <span className="shrink-0 text-muted">{amountText(p.quantity, amountUnitLabel(p.food, p.unit))}</span>
            </li>
          ))}
        </ul>
        <NutritionTiles nutrients={per} label={kind === 'recipe' ? `Nutrition per serving of ${item.name}` : `Nutrition for ${item.name}`} />
      </section>
    </li>
  )
}

/** The Custom meals and Custom recipes screens: a list of cards with an editor and delete. */
export function PortionListPage<T extends PortionList>({ kind, list, save, remove, intro, removeNote }: Props<T>) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const key = foodsKey(userId, kind === 'meal' ? 'meals' : 'recipes')
  const items = useQuery({ queryKey: key, queryFn: () => list(userId) })
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [removing, setRemoving] = useState<T | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['foods', userId] })
  const saveMutation = useMutation({
    mutationFn: ({ input, previous }: { input: PortionListInput & { id?: string }; previous: string[] }) => save(userId, input, previous),
    onSuccess: async () => {
      await refresh()
      setEditing(null)
    },
  })
  const noun = kind === 'meal' ? 'meal' : 'recipe'
  const current = editing === 'new' ? null : editing

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{intro}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} /> New {noun}
        </Button>
      </div>

      {items.isError ? (
        <Alert tone="error">Couldn’t load your {noun}s. Refresh to try again.</Alert>
      ) : items.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.data.length === 0 ? (
        <p className="rounded-xl bg-surface py-10 text-center text-sm text-muted">No {noun}s yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.data.map((item) => (
            <ListCard key={item.id} item={item} kind={kind} onEdit={() => setEditing(item)} onDelete={() => setRemoving(item)} />
          ))}
        </ul>
      )}

      <PortionEditor
        open={editing !== null}
        kind={kind}
        initial={current}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          await saveMutation.mutateAsync({
            input: { ...input, id: current?.id },
            previous: (current?.items ?? []).flatMap((i) => (i.id ? [i.id] : [])),
          })
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title={`Delete ${noun}`}
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await remove(removing!.id)
          await refresh()
          setRemoving(null)
        }}
      >
        <p>
          Delete “{removing?.name}”? {removeNote}
        </p>
      </ConfirmDialog>
    </div>
  )
}
