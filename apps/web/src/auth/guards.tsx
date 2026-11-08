import { Navigate, Outlet, useLocation } from 'react-router'
import { isOnboarded, useProfile } from '../features/profile/useProfile'
import { useAuth } from './AuthProvider'

function FullPageMessage({ children }: { children: string }) {
  return <p className="flex min-h-svh items-center justify-center text-sm text-muted">{children}</p>
}

/** Signed-in users only; everyone else goes to the login page and comes back after. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageMessage>Loading…</FullPageMessage>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** App screens need a finished profile; send new users to onboarding first. */
export function RequireOnboarded() {
  const { session } = useAuth()
  const profile = useProfile(session?.user.id)
  if (profile.isPending) return <FullPageMessage>Loading…</FullPageMessage>
  if (profile.isError) return <FullPageMessage>Couldn’t load your profile. Refresh to try again.</FullPageMessage>
  if (!isOnboarded(profile.data)) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** Login and signup pages skip straight to the app for signed-in users. */
export function RedirectIfSignedIn() {
  const { session, loading } = useAuth()
  if (loading) return <FullPageMessage>Loading…</FullPageMessage>
  if (session) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
