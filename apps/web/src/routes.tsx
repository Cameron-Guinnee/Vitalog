import { Navigate, type RouteObject } from 'react-router'
import { RedirectIfSignedIn, RequireAuth, RequireOnboarded } from './auth/guards'
import { AppShell } from './components/layout/AppShell'
import { NAV } from './components/layout/nav'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Login } from './pages/auth/Login'
import { ResetPassword } from './pages/auth/ResetPassword'
import { Signup } from './pages/auth/Signup'
import { ComingSoon } from './pages/ComingSoon'
import { Diary } from './pages/Diary'
import { NotFound } from './pages/NotFound'
import { Onboarding } from './pages/Onboarding'

const PORTED = new Set(['/dashboard', '/diary'])

// Every other sidebar destination gets a placeholder until its screen is ported.
const placeholders: RouteObject[] = NAV.flatMap((item) => (item.children ?? [{ path: item.path! }]).map((c) => c.path))
  .filter((path) => !PORTED.has(path))
  .map((path) => ({ path, element: <ComingSoon /> }))

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: <RedirectIfSignedIn />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
  // Reached from the reset email with a temporary session, so it isn't behind either guard.
  { path: '/reset-password', element: <ResetPassword /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <Onboarding /> },
      {
        element: <RequireOnboarded />,
        children: [
          {
            element: <AppShell />,
            children: [{
                path: '/dashboard',
                // Loaded on demand: the charts library is most of its weight.
                lazy: async () => ({ Component: (await import('./pages/Dashboard')).Dashboard }),
              }, { path: '/diary', element: <Diary /> }, ...placeholders],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
