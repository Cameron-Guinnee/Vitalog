import { Navigate, type RouteObject } from 'react-router'
import { RedirectIfSignedIn, RequireAuth, RequireOnboarded } from './auth/guards'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Login } from './pages/auth/Login'
import { ResetPassword } from './pages/auth/ResetPassword'
import { Signup } from './pages/auth/Signup'
import { Dashboard } from './pages/Dashboard'
import { NotFound } from './pages/NotFound'
import { Onboarding } from './pages/Onboarding'

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
        children: [{ path: '/dashboard', element: <Dashboard /> }],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
