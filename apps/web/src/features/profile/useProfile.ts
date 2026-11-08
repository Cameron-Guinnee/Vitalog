import { useQuery } from '@tanstack/react-query'
import type { Tables } from '@vitalog/shared'
import { supabase } from '../../lib/supabase'

export type Profile = Tables<'profiles'>

export const profileQueryKey = (userId: string) => ['profile', userId] as const

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single()
      if (error) throw error
      return data
    },
  })
}

/** Onboarding is done once the fields the energy calculations need are filled in. */
export function isOnboarded(profile: Pick<Profile, 'date_of_birth' | 'sex' | 'height_cm'> | null | undefined) {
  return !!(profile?.date_of_birth && profile.sex && profile.height_cm)
}
