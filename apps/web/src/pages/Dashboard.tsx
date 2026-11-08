import { toDayKey } from '@vitalog/shared'
import { useState } from 'react'
import { useUserId } from '../auth/AuthProvider'
import { AddEntryButtons } from '../features/diary/AddEntryButtons'
import { AddEntryDialogs, type EntryKind } from '../features/diary/AddEntryDialogs'
import { BiometricTrendCard } from '../features/dashboard/cards/BiometricTrendCard'
import { EnergyConsumedCard } from '../features/dashboard/cards/EnergyConsumedCard'
import { EnergyHistoryCard } from '../features/dashboard/cards/EnergyHistoryCard'
import { FastingCard } from '../features/dashboard/cards/FastingCard'
import { SleepCard } from '../features/dashboard/cards/SleepCard'
import { StreaksCard } from '../features/dashboard/cards/StreaksCard'
import { WeightChangeCard } from '../features/dashboard/cards/WeightChangeCard'
import { WeightGoalCard } from '../features/dashboard/cards/WeightGoalCard'
import { activeDiaryGroups, displaySettingsFrom } from '../features/profile/displaySettings'
import { useProfile } from '../features/profile/useProfile'

export function Dashboard() {
  const userId = useUserId()
  const { data: profile } = useProfile(userId)
  const [dialog, setDialog] = useState<EntryKind | null>(null)
  if (!profile) return null

  const today = toDayKey(new Date())
  const settings = displaySettingsFrom(profile.display_settings)
  const units = profile.units_preference === 'metric' ? 'metric' : 'imperial'
  const calorieGoal = profile.calorie_goal ?? 2000

  // Three columns on wide screens, in the same order as the Vue app; a column with no cards is dropped.
  const columns = [
    [
      settings.show_fasting && <FastingCard key="fasting" userId={userId} />,
      settings.show_weight_goal && (
        <WeightGoalCard key="goal" userId={userId} units={units} profile={profile} onLogWeight={() => setDialog('biometric')} />
      ),
      settings.show_energy_consumed && <EnergyConsumedCard key="consumed" userId={userId} today={today} />,
    ],
    [
      settings.show_energy_history && <EnergyHistoryCard key="history" userId={userId} today={today} calorieGoal={calorieGoal} />,
      settings.show_weight_change && <WeightChangeCard key="change" userId={userId} today={today} units={units} goal={profile.weight_goal} />,
      settings.show_sleep && <SleepCard key="sleep" userId={userId} today={today} />,
    ],
    [
      settings.show_streaks && <StreaksCard key="streaks" userId={userId} today={today} />,
      settings.show_weight && <BiometricTrendCard key="biometrics" userId={userId} today={today} units={units} />,
    ],
  ]
    .map((c) => c.filter(Boolean))
    .filter((c) => c.length)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Welcome back, {profile.display_name}</h2>
        <AddEntryButtons onAdd={setDialog} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {columns.map((cards, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-4">
            {cards}
          </div>
        ))}
      </div>
      <AddEntryDialogs
        open={dialog}
        onClose={() => setDialog(null)}
        userId={userId}
        day={today}
        groups={activeDiaryGroups(settings)}
        units={units}
      />
    </div>
  )
}
