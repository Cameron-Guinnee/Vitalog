import { useQueryClient } from '@tanstack/react-query'
import type { ActiveGroup } from '../profile/displaySettings'
import { addBiometric, addExercise, addFoodEntry, addNote, diaryQueryKey } from './api'
import { BiometricDialog } from './BiometricDialog'
import { ExerciseDialog } from './ExerciseDialog'
import { FoodDialog, type FoodToAdd } from './FoodDialog'
import { NoteDialog } from './NoteDialog'

export type EntryKind = 'food' | 'note' | 'exercise' | 'biometric'

type Props = {
  open: EntryKind | null
  onClose: () => void
  userId: string
  day: string
  groups: ActiveGroup[]
  units: 'imperial' | 'metric'
}

/** The four "add to diary" dialogs, used by the diary and the dashboard's quick-add bar. */
export function AddEntryDialogs({ open, onClose, userId, day, groups, units }: Props) {
  const queryClient = useQueryClient()

  // Anything logged can change the diary for that day and every dashboard card.
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: diaryQueryKey(userId, day) }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
    ])
  }

  async function handleAddFood(f: FoodToAdd) {
    await addFoodEntry({
      userId,
      day,
      food: { id: f.food.id, isCustom: f.food.kind === 'custom' },
      group: f.group.index,
      groupName: f.group.name,
      quantity: f.quantity,
      servingUnit: f.servingUnit,
      nutrients: f.nutrients,
    })
    await refresh()
  }

  return (
    <>
      <FoodDialog open={open === 'food'} onClose={onClose} userId={userId} groups={groups} defaultGroup={1} onAdd={handleAddFood} />
      <ExerciseDialog
        open={open === 'exercise'}
        onClose={onClose}
        userId={userId}
        groups={groups}
        onSave={async (e) => {
          await addExercise({ userId, day, ...e })
          await refresh()
        }}
      />
      <BiometricDialog
        open={open === 'biometric'}
        onClose={onClose}
        units={units}
        groups={groups}
        onSave={async (b) => {
          await addBiometric({ userId, day, ...b })
          await refresh()
          // A new weigh-in changes the weight used for exercise estimates.
          await queryClient.invalidateQueries({ queryKey: ['latest-weight', userId] })
        }}
      />
      <NoteDialog
        open={open === 'note'}
        onClose={onClose}
        groups={groups}
        onSave={async (n) => {
          await addNote({ userId, day, ...n })
          await refresh()
        }}
      />
    </>
  )
}
