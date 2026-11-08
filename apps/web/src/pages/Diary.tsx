import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toDayKey } from '@vitalog/shared'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useUserId } from '../auth/AuthProvider'
import { Alert } from '../components/ui/alert'
import { AddEntryButtons } from '../features/diary/AddEntryButtons'
import { AddEntryDialogs, type EntryKind } from '../features/diary/AddEntryDialogs'
import { deleteDiaryEntry, diaryQueryKey, fetchDiaryDay, type DiaryEntry } from '../features/diary/api'
import { DateNavigator } from '../features/diary/DateNavigator'
import { EnergySummary } from '../features/diary/EnergySummary'
import { MealSection } from '../features/diary/MealSection'
import { NutrientTable } from '../features/diary/NutrientTable'
import { WaterTracker } from '../features/diary/WaterTracker'
import { activeDiaryGroups, displaySettingsFrom } from '../features/profile/displaySettings'
import { useProfile } from '../features/profile/useProfile'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function Diary() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date')
  const day = dateParam && DAY_PATTERN.test(dateParam) ? dateParam : toDayKey(new Date())
  const [dialog, setDialog] = useState<EntryKind | null>(null)

  const profile = useProfile(userId)
  const settings = displaySettingsFrom(profile.data?.display_settings)
  const groups = activeDiaryGroups(settings)
  const diary = useQuery({ queryKey: diaryQueryKey(userId, day), queryFn: () => fetchDiaryDay(userId, day) })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: diaryQueryKey(userId, day) }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
    ])
  const remove = useMutation({ mutationFn: (e: DiaryEntry) => deleteDiaryEntry(e), onSettled: refresh })

  function setDay(next: string) {
    setParams(next === toDayKey(new Date()) ? {} : { date: next })
  }

  // Entries in hidden or deleted groups still show, under the first visible group.
  const visible = new Set(groups.map((g) => g.index))
  const entriesFor = (index: number) =>
    (diary.data?.entries ?? []).filter((e) => e.group === index || (index === groups[0]!.index && !visible.has(e.group)))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateNavigator day={day} onChange={setDay} />
        <AddEntryButtons onAdd={setDialog} />
      </div>

      {diary.isError && <Alert tone="error">Couldn’t load this day. Refresh to try again.</Alert>}
      {remove.isError && <Alert tone="error">Couldn’t delete that entry. Please try again.</Alert>}

      {(settings.show_energy_summary || settings.show_water_widget) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {settings.show_energy_summary && (
            <div className={settings.show_water_widget ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <EnergySummary
                nutrients={diary.data?.nutrients ?? {}}
                calorieGoal={profile.data?.calorie_goal ?? 2000}
                caloriesBurned={diary.data?.caloriesBurned ?? 0}
              />
            </div>
          )}
          {settings.show_water_widget && (
            <div className={settings.show_energy_summary ? '' : 'lg:col-span-3'}>
              <WaterTracker nutrients={diary.data?.nutrients ?? {}} unit={settings.water_unit} goalGlasses={settings.water_goal_glasses} />
            </div>
          )}
        </div>
      )}

      {diary.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        groups.map((g) => <MealSection key={g.index} title={g.name} entries={entriesFor(g.index)} onDelete={(e) => remove.mutate(e)} />)
      )}

      <NutrientTable nutrients={diary.data?.nutrients ?? {}} />

      <AddEntryDialogs
        open={dialog}
        onClose={() => setDialog(null)}
        userId={userId}
        day={day}
        groups={groups}
        units={profile.data?.units_preference === 'metric' ? 'metric' : 'imperial'}
      />
    </div>
  )
}
