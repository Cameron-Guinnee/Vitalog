import type { Json } from '@vitalog/shared'

export type DiaryGroup = { enabled: boolean; name: string }

export type DisplaySettings = {
  show_energy_summary: boolean
  show_water_widget: boolean
  show_diary_groups: boolean
  water_unit: string
  water_goal_glasses: number
  energy_unit: string
  // Dashboard cards
  show_fasting: boolean
  show_weight_goal: boolean
  show_energy_consumed: boolean
  show_energy_history: boolean
  show_weight_change: boolean
  show_sleep: boolean
  show_streaks: boolean
  show_weight: boolean
  diary_groups: DiaryGroup[]
  [key: string]: unknown
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  show_energy_summary: true,
  show_water_widget: true,
  show_diary_groups: true,
  water_unit: 'fl_oz',
  water_goal_glasses: 8,
  energy_unit: 'kcal',
  show_fasting: true,
  show_weight_goal: true,
  show_energy_consumed: true,
  show_energy_history: true,
  show_weight_change: true,
  show_sleep: true,
  show_streaks: true,
  show_weight: true,
  diary_groups: [
    { enabled: true, name: 'Uncategorized' },
    { enabled: true, name: 'Breakfast' },
    { enabled: true, name: 'Lunch' },
    { enabled: true, name: 'Dinner' },
    { enabled: true, name: 'Snacks' },
    { enabled: false, name: 'Group 6' },
    { enabled: false, name: 'Group 7' },
    { enabled: false, name: 'Group 8' },
  ],
}

/** profiles.display_settings holds only what the user changed; fill in the rest. */
export function displaySettingsFrom(stored: Json | null | undefined): DisplaySettings {
  const saved = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  return { ...DEFAULT_DISPLAY_SETTINGS, ...(saved as Partial<DisplaySettings>) }
}

export type ActiveGroup = DiaryGroup & { index: number }

/** The diary sections to show, keeping each group's position as its meal_group number. */
export function activeDiaryGroups(settings: DisplaySettings): ActiveGroup[] {
  const uncategorized = [{ enabled: true, name: 'Uncategorized', index: 0 }]
  if (!settings.show_diary_groups) return uncategorized
  const groups = settings.diary_groups.map((g, index) => ({ ...g, index })).filter((g) => g.enabled && g.name)
  return groups.length ? groups : uncategorized
}
