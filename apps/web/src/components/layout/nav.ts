import { Apple, BarChart3, CircleHelp, Ellipsis, LayoutDashboard, NotebookPen, type LucideIcon } from 'lucide-react'

export type NavLinkItem = { label: string; path: string }
export type NavItem = { label: string; icon: LucideIcon } & ({ path: string; children?: never } | { path?: never; children: NavLinkItem[] })

export const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Diary', icon: NotebookPen, path: '/diary' },
  {
    label: 'Trends',
    icon: BarChart3,
    children: [
      { label: 'Charts', path: '/trends/charts' },
      { label: 'Nutrition report', path: '/trends/nutrition-report' },
      { label: 'Print report', path: '/trends/print-report' },
      { label: 'Snapshots', path: '/trends/snapshots' },
    ],
  },
  {
    label: 'Foods',
    icon: Apple,
    children: [
      { label: 'Custom meals', path: '/foods/custom-meals' },
      { label: 'Custom recipes', path: '/foods/custom-recipes' },
      { label: 'Custom foods', path: '/foods/custom-foods' },
      { label: 'Repeat items', path: '/foods/repeat-items' },
      { label: 'Search foods', path: '/foods/search' },
    ],
  },
  {
    label: 'More',
    icon: Ellipsis,
    children: [
      { label: 'Targets and profile', path: '/more/targets' },
      { label: 'Fasting', path: '/more/fasting' },
      { label: 'Display settings', path: '/more/display' },
      { label: 'Sync a device', path: '/more/sync' },
      { label: 'Your account', path: '/more/account' },
    ],
  },
  { label: 'Support', icon: CircleHelp, path: '/support' },
]

/** Title for the top bar, from the deepest nav entry matching the path. */
export function titleFor(pathname: string): string {
  for (const item of NAV) {
    if (item.path === pathname) return item.label
    const child = item.children?.find((c) => c.path === pathname)
    if (child) return child.label
  }
  return 'Vitalog'
}
