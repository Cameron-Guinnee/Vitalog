import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { isPro } from '@vitalog/shared'
import { useAuth } from '../../auth/AuthProvider'
import { useProfile } from '../../features/profile/useProfile'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { NAV, titleFor, type NavItem } from './nav'

const COLLAPSED_KEY = 'vitalog.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function NavGroup({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const childActive = !!item.children?.some((c) => c.path === pathname)
  const [open, setOpen] = useState(childActive)
  const Icon = item.icon
  const base = 'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors'

  if (item.path) {
    return (
      <NavLink
        to={item.path}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) => cn(base, isActive ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-surface-raised hover:text-foreground')}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && item.label}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        title={collapsed ? item.label : undefined}
        onClick={() => setOpen(!open)}
        className={cn(base, childActive ? 'text-primary' : 'text-muted hover:bg-surface-raised hover:text-foreground')}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="ml-6 flex flex-col border-l border-border pl-2">
          {item.children!.map((c) => (
            <NavLink
              key={c.path}
              to={c.path}
              onClick={onNavigate}
              className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm', isActive ? 'text-primary' : 'text-muted hover:text-foreground')}
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const { session } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  const [open, setOpen] = useState(false)
  const pro = isPro(profile?.subscription_tier)

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-raised hover:text-foreground"
      >
        <UserCircle size={20} />
        <span className="hidden sm:inline">Account</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl">
          <p className="truncate text-sm">{session?.user.email}</p>
          <p className="text-xs text-muted">{pro ? 'Vitalog Pro' : 'Vitalog Free'}</p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-raised hover:text-foreground"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/** Layout for every signed-in screen: sidebar, top bar and the page below. */
export function AppShell() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // Storage can be unavailable (private mode); the sidebar just won't remember.
    }
  }, [collapsed])

  const nav = (isCollapsed: boolean) => (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavGroup key={item.label} item={item} collapsed={isCollapsed} onNavigate={() => setMobileOpen(false)} />
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-svh">
      <aside className={cn('sticky top-0 hidden h-svh shrink-0 flex-col gap-4 border-r border-border bg-surface p-3 md:flex', collapsed ? 'w-16' : 'w-60')}>
        <div className="flex items-center justify-between px-1">
          {!collapsed && <span className="text-lg font-semibold">Vitalog</span>}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-md p-2 text-muted hover:bg-surface-raised hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        {nav(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-64 bg-surface p-3" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 px-2 text-lg font-semibold">Vitalog</p>
            {nav(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-md p-2 text-muted hover:text-foreground md:hidden">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold">{titleFor(pathname)}</h1>
          </div>
          <AccountMenu />
        </header>
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
