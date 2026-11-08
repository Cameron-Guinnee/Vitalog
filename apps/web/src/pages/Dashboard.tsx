import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../features/profile/useProfile'

// Placeholder until the dashboard cards are ported.
export function Dashboard() {
  const { session } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold">Welcome, {profile?.display_name}</h2>
      <p className="text-muted">Your daily calorie goal is {profile?.calorie_goal} kcal.</p>
    </div>
  )
}
