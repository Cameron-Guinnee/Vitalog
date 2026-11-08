import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formFromProfile, switchUnits } from './pages/more/Targets'
import { createFakeSupabase, type FakeSupabase } from './test/fakeSupabase'
import { renderApp } from './test/renderApp'

const fake = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }))

vi.mock('./lib/supabase', () => ({
  get supabase() {
    return fake.current.client
  },
  appUrl: (path: string) => `https://vitalog.test${path}`,
}))

const user = { id: 'user-1', email: 'a@example.com' }
const profile = {
  id: user.id,
  display_name: 'Alice',
  date_of_birth: '1995-04-02',
  sex: 'female',
  height_cm: 167.6,
  units_preference: 'imperial',
  activity_level: 'lightly_active',
  weight_goal_type: 'lose',
  weight_goal: 150,
  weekly_rate: -1,
  calorie_goal: 1650,
  subscription_tier: 'free',
  display_settings: { theme: 'dark', show_sleep: false },
  updated_at: '2026-11-01T00:00:00Z',
}
const writes = (table: string) => fake.current.state.calls.filter((c) => c.table === table)

beforeEach(() => {
  fake.current = createFakeSupabase()
  fake.current.state.session = { user }
  fake.current.state.profile = { ...profile }
  fake.current.state.rows = { biometrics: [{ logged_at: '2026-11-07T08:00:00Z', value: 170, unit: 'lbs' }] }
})

describe('targets and profile', () => {
  it('loads the saved goal without overwriting the calorie goal', async () => {
    renderApp('/more/targets')
    expect(await screen.findByLabelText('Daily calorie goal (kcal)')).toHaveValue(1650)
    expect(screen.getByLabelText('Height, feet')).toHaveValue(5)
    expect(screen.getByLabelText('Height, inches')).toHaveValue(6)
    expect(screen.getByLabelText('Current weight (lb)')).toHaveValue(170)
    expect(screen.getByLabelText('Target weight (lb)')).toHaveValue(150)
    expect(screen.getByRole('radio', { name: /Lose 1 lb a week/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves the profile, and logs a weigh-in only when the weight changed', async () => {
    renderApp('/more/targets')
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('status')).toHaveTextContent('saved')
    expect(writes('biometrics')).toHaveLength(0)
    expect(writes('profiles')[0]!.payload).toMatchObject({ weight_goal: 150, weekly_rate: -1, calorie_goal: 1650, units_preference: 'imperial', height_cm: 167.6 })

    await userEvent.clear(screen.getByLabelText('Current weight (lb)'))
    await userEvent.type(screen.getByLabelText('Current weight (lb)'), '168')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(writes('biometrics')).toHaveLength(1))
    expect(writes('biometrics')[0]!.payload).toMatchObject({ user_id: user.id, metric_type: 'weight', value: 168, unit: 'lbs' })
  })

  it('converts measurements when switching units, so the goal is saved in the new unit', async () => {
    renderApp('/more/targets')
    await userEvent.click(await screen.findByRole('radio', { name: /Metric/ }))
    expect(screen.getByLabelText('Height (cm)')).toHaveValue(167.6)
    expect(screen.getByLabelText('Target weight (kg)')).toHaveValue(68)
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('status')
    expect(writes('profiles')[0]!.payload).toMatchObject({ units_preference: 'metric', weight_goal: 68 })
    // The same weight in a new unit isn't a new weigh-in.
    expect(writes('biometrics')).toHaveLength(0)
  })

  it('suggests calories when the goal changes', async () => {
    renderApp('/more/targets')
    await userEvent.click(await screen.findByRole('radio', { name: /Maintain weight/ }))
    const suggested = Number((screen.getByLabelText('Daily calorie goal (kcal)') as HTMLInputElement).value)
    expect(suggested).toBeGreaterThan(1650)
    expect(screen.queryByLabelText(/Target weight/)).not.toBeInTheDocument()
  })

  it('keeps form helpers consistent', () => {
    const form = formFromProfile({ ...profile, height_cm: 182.88 } as never, 200)
    expect(form).toMatchObject({ heightFt: '6', heightIn: '0', weight: '200', weeklyKcal: '-500' })
    expect(switchUnits(form, 'metric')).toMatchObject({ heightCm: '182.9', weight: '90.7' })
  })
})

describe('fasting', () => {
  it('starts a fast with the chosen target', async () => {
    renderApp('/more/fasting')
    await userEvent.click(await screen.findByRole('radio', { name: /18:6/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Start 18-hour fast' }))
    await waitFor(() => expect(writes('fasting_log')).toHaveLength(1))
    expect(writes('fasting_log')[0]!.payload).toMatchObject({ user_id: user.id, target_duration_hours: 18 })
  })

  it('times the active fast against its own target and lists history', async () => {
    const started = new Date(Date.now() - 2 * 3_600_000).toISOString()
    fake.current.state.rows = {
      fasting_log: [
        { id: 'a', started_at: started, ended_at: null, target_duration_hours: 20 },
        { id: 'b', started_at: '2026-11-01T20:00:00Z', ended_at: '2026-11-02T12:30:00Z', target_duration_hours: 16 },
      ],
    }
    renderApp('/more/fasting')
    expect(await screen.findByText(/Target 20 hours/)).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'History' })
    expect(within(history).getByText('16h 30m')).toBeInTheDocument()
    expect(within(history).getByLabelText('Target reached')).toBeInTheDocument()

    await userEvent.click(within(history).getByRole('button', { name: /Delete the fast/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(writes('fasting_log')[0]).toMatchObject({ op: 'delete', filters: [['eq', 'id', 'b']] }))
  })
})

describe('display settings', () => {
  it('saves changes and keeps settings this screen does not show', async () => {
    renderApp('/more/display')
    const sleep = await screen.findByRole('switch', { name: 'Sleep' })
    expect(sleep).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sleep)
    await userEvent.click(screen.getByRole('radio', { name: 'mL' }))
    await userEvent.clear(screen.getByLabelText('Group 2 name'))
    await userEvent.type(screen.getByLabelText('Group 2 name'), 'Breakfast & coffee')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('status')).toHaveTextContent('saved')
    const saved = (writes('profiles')[0]!.payload as { display_settings: Record<string, unknown> }).display_settings
    expect(saved).toMatchObject({ theme: 'dark', show_sleep: true, water_unit: 'ml' })
    expect((saved.diary_groups as { name: string }[])[1]!.name).toBe('Breakfast & coffee')
  })

  it('needs a name for every group that is on', async () => {
    renderApp('/more/display')
    await userEvent.clear(await screen.findByLabelText('Group 1 name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Give every diary group you turn on a name.')
    expect(writes('profiles')).toHaveLength(0)
  })
})

describe('sync a device', () => {
  it('says the integrations are not live yet', async () => {
    renderApp('/more/sync')
    expect(await screen.findByText(/None of these integrations are active yet/)).toBeInTheDocument()
    expect(screen.getAllByText('Coming soon')).toHaveLength(5)
  })
})

describe('your account', () => {
  it('saves the display name', async () => {
    renderApp('/more/account')
    const name = await screen.findByLabelText('Display name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Ali')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('status')).toHaveTextContent('saved')
    expect(writes('profiles')[0]!.payload).toMatchObject({ display_name: 'Ali' })
    expect(screen.getByLabelText('Email')).toHaveValue(user.email)
  })

  it('checks the current password before changing it', async () => {
    const { auth } = fake.current.client
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } })
    renderApp('/more/account')
    await userEvent.type(await screen.findByLabelText('Current password'), 'wrong-one')
    await userEvent.type(screen.getByLabelText('New password'), 'a-new-password')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'a-new-password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('current password isn’t right')
    expect(auth.updateUser).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByRole('status')).toHaveTextContent('password is changed')
    expect(auth.signInWithPassword).toHaveBeenLastCalledWith({ email: user.email, password: 'wrong-one' })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a-new-password' })
  })

  it('deletes the account only after typing DELETE', async () => {
    const { router } = renderApp('/more/account')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete your account?' })
    const confirm = within(dialog).getByRole('button', { name: 'Delete my account' })
    expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE')
    await userEvent.click(confirm)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(fake.current.client.rpc).toHaveBeenCalledWith('delete_own_account')
    expect(fake.current.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('keeps the user signed in when deletion fails', async () => {
    fake.current.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    renderApp('/more/account')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete my account' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was removed')
    expect(fake.current.client.auth.signOut).not.toHaveBeenCalled()
  })
})
