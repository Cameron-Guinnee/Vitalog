import { useQueryClient } from '@tanstack/react-query'
import type { ActiveGroup } from '../profile/displaySettings'
import { addBiometric, addExercise, addFoodEntries, addNote, diaryQueryKey } from './api'
import { BiometricDialog } from './BiometricDialog'
import { ExerciseDialog } from './ExerciseDialog'
import { FoodDialog, type FoodSelection, type FoodToLog } from './FoodDialog'
import { NoteDialog } from './NoteDialog'

export type EntryKind = 'food' | 'note' | 'exercise' | 'biometric'

type Props = {
  open: EntryKind | null
  onClose: () => void
  userId: string
  day: string
  groups: ActiveGroup[]
  units: 'imperial' | 'metric'
  /** Opens the food dialog straight to this food, meal or recipe. */
  initialFood?: FoodSelection | null
}

/** The four "add to diary" dialogs, used by the diary and the dashboard's quick-add bar. */
export function AddEntryDialogs({ open, onClose, userId, day, groups, units, initialFood }: Props) {
  const queryClient = useQueryClient()

  // Anything logged can change the diary for that day and every dashboard card.
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: diaryQueryKey(userId, day) }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
    ])
  }

  async function handleAddFood(f: FoodToLog) {
    await addFoodEntries({ userId, day, group: f.group.index, groupName: f.group.name, entries: f.entries })
    await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['foods', userId] })])
  }

  return (
    <>
      <FoodDialog open={open === 'food'} onClose={onClose} userId={userId} groups={groups} defaultGroup={1} onAdd={handleAddFood} initial={initialFood} />
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
