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
import { CustomFoods } from './pages/foods/CustomFoods'
import { CustomMeals } from './pages/foods/CustomMeals'
import { CustomRecipes } from './pages/foods/CustomRecipes'
import { RepeatItems } from './pages/foods/RepeatItems'
import { SearchFoods } from './pages/foods/SearchFoods'
import { DisplaySettings } from './pages/more/DisplaySettings'
import { Fasting } from './pages/more/Fasting'
import { SyncDevice } from './pages/more/SyncDevice'
import { Targets } from './pages/more/Targets'
import { YourAccount } from './pages/more/YourAccount'
import { NotFound } from './pages/NotFound'
import { Onboarding } from './pages/Onboarding'

// Screens with charts are loaded on demand: the charts library is most of their weight.
const lazyPages: RouteObject[] = [
  { path: '/dashboard', lazy: async () => ({ Component: (await import('./pages/Dashboard')).Dashboard }) },
  { path: '/trends/charts', lazy: async () => ({ Component: (await import('./pages/trends/Charts')).Charts }) },
  { path: '/trends/nutrition-report', lazy: async () => ({ Component: (await import('./pages/trends/NutritionReport')).NutritionReport }) },
  { path: '/trends/print-report', lazy: async () => ({ Component: (await import('./pages/trends/PrintReport')).PrintReport }) },
  { path: '/trends/snapshots', lazy: async () => ({ Component: (await import('./pages/trends/Snapshots')).Snapshots }) },
]

const foodPages: RouteObject[] = [
  { path: '/foods/custom-foods', element: <CustomFoods /> },
  { path: '/foods/custom-meals', element: <CustomMeals /> },
  { path: '/foods/custom-recipes', element: <CustomRecipes /> },
  { path: '/foods/repeat-items', element: <RepeatItems /> },
  { path: '/foods/search', element: <SearchFoods /> },
]

const morePages: RouteObject[] = [
  { path: '/more/targets', element: <Targets /> },
  { path: '/more/fasting', element: <Fasting /> },
  { path: '/more/display', element: <DisplaySettings /> },
  { path: '/more/sync', element: <SyncDevice /> },
  { path: '/more/account', element: <YourAccount /> },
]

const PORTED = new Set(['/diary', ...[...lazyPages, ...foodPages, ...morePages].map((r) => r.path)])

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
            children: [{ path: '/diary', element: <Diary /> }, ...lazyPages, ...foodPages, ...morePages, ...placeholders],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
