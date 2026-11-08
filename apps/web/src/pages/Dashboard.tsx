import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/button'
import { useProfile } from '../features/profile/useProfile'
import { supabase } from '../lib/supabase'

// Placeholder until the dashboard cards are ported.
export function Dashboard() {
  const { session } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Welcome, {profile?.display_name}</h1>
      <p className="text-muted">Your daily calorie goal is {profile?.calorie_goal} kcal.</p>
      <Button variant="secondary" className="self-start" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </main>
  )
}
