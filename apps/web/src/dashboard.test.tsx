import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NUTRIENT, addDays, timestampForDay, toDayKey } from '@vitalog/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
const today = toDayKey(new Date())

beforeEach(() => {
  fake.current = createFakeSupabase()
  fake.current.state.session = { user }
  fake.current.state.profile = {
    id: user.id,
    display_name: 'Alice',
    date_of_birth: '1995-04-02',
    sex: 'female',
    height_cm: 165,
    calorie_goal: 2000,
    units_preference: 'imperial',
    weight_goal_type: 'lose',
    weight_goal: 150,
    subscription_tier: 'free',
    display_settings: {},
  }
})

const card = (name: string) => screen.findByRole('region', { name })

describe('dashboard', () => {
  it('shows each card the display settings turn on', async () => {
    fake.current.state.profile!.display_settings = { show_sleep: false, show_fasting: false }
    renderApp('/dashboard')
    for (const name of ['Weight goal', 'Energy consumed', 'Energy history', 'Weight change', 'Streaks', 'Biometrics']) {
      expect(await card(name)).toBeInTheDocument()
    }
    expect(screen.queryByRole('region', { name: 'Sleep' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Fasting' })).not.toBeInTheDocument()
  })

  it('shows weigh-ins in the user’s units and opens the weight dialog from the goal card', async () => {
    // Logged in kg on another device; the profile is imperial.
    fake.current.state.rows = { biometrics: [{ logged_at: new Date().toISOString(), value: 80, unit: 'kg' }] }
    renderApp('/dashboard')
    const goal = await card('Weight goal')
    expect(await within(goal).findByText('176.4 lbs')).toBeInTheDocument()
    expect(within(goal).getByText('150 lbs')).toBeInTheDocument()
    expect(within(goal).getByText('26.4 lbs to go')).toBeInTheDocument()

    await userEvent.click(within(goal).getByRole('button', { name: 'Log weight' }))
    expect(await screen.findByRole('dialog', { name: 'Log biometric' })).toBeInTheDocument()
  })

  it('averages calories over the days with food and lets the range change', async () => {
    const food = (day: string, kcal: number, protein: number) => ({
      id: day,
      logged_at: timestampForDay(day),
      diary_nutrient_values: [
        { nutrient_id: NUTRIENT.energy, value: kcal },
        { nutrient_id: NUTRIENT.protein, value: protein },
      ],
    })
    fake.current.state.rows = { diary_entries: [food(today, 1800, 100), food(addDays(today, -1), 2200, 50)] }
    renderApp('/dashboard')
    const consumed = await card('Energy consumed')
    // Protein only: 400 and 200 kcal.
    expect(await within(consumed).findByText('300')).toBeInTheDocument()

    await userEvent.click(within(consumed).getByRole('button', { name: '30 days' }))
    expect(within(consumed).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(await within(consumed).findByText('300')).toBeInTheDocument()
  })

  it('counts a streak from the days with entries', async () => {
    fake.current.state.rows = {
      diary_entries: [{ id: 'a', logged_at: timestampForDay(addDays(today, -1)) }, { id: 'b', logged_at: timestampForDay(addDays(today, -2)) }],
      streaks: [{ longest_streak: 1 }],
    }
    fake.current.state.counts = { diary_entries: 42 }
    renderApp('/dashboard')
    const streaks = await card('Streaks')
    expect(await within(streaks).findAllByText('2 days')).toHaveLength(2)
    expect(within(streaks).getByText('Log something today to keep your streak.')).toBeInTheDocument()

    await userEvent.click(within(streaks).getByRole('button', { name: 'Show streaks details' }))
    expect(within(streaks).getByText('42')).toBeInTheDocument()
  })

  it('starts a fast with the chosen target', async () => {
    renderApp('/dashboard')
    const fasting = await card('Fasting')
    await userEvent.selectOptions(await within(fasting).findByLabelText('Fasting target'), '18')
    await userEvent.click(within(fasting).getByRole('button', { name: 'Start fast' }))
    await waitFor(() =>
      expect(fake.current.state.calls).toContainEqual(
        expect.objectContaining({ table: 'fasting_log', op: 'insert', payload: expect.objectContaining({ user_id: user.id, target_duration_hours: 18 }) }),
      ),
    )
  })

  it('shows a fast in progress and marks it completed only once the target is reached', async () => {
    const started = new Date(Date.now() - 2 * 3_600_000).toISOString()
    fake.current.state.rows = { fasting_log: [{ id: 'fast-1', started_at: started, ended_at: null, target_duration_hours: 16 }] }
    renderApp('/dashboard')
    const fasting = await card('Fasting')
    expect(await within(fasting).findByLabelText('Time fasted')).toHaveTextContent(/^02:00:0\d$/)

    await userEvent.click(within(fasting).getByRole('button', { name: 'End fast' }))
    await waitFor(() =>
      expect(fake.current.state.calls).toContainEqual(
        expect.objectContaining({ table: 'fasting_log', op: 'update', payload: expect.objectContaining({ completed: false }), filters: [['eq', 'id', 'fast-1']] }),
      ),
    )
  })

  it('adds a note to today from the quick-add bar', async () => {
    renderApp('/dashboard')
    await userEvent.click(await screen.findByRole('button', { name: 'Note' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add note' })
    await userEvent.type(within(dialog).getByRole('textbox'), 'Big lunch')
    await userEvent.click(within(dialog).getByRole('button', { name: /save|add/i }))
    await waitFor(() =>
      expect(fake.current.state.calls).toContainEqual(
        expect.objectContaining({ table: 'notes', op: 'insert', payload: expect.objectContaining({ content: 'Big lunch' }) }),
      ),
    )
    const note = fake.current.state.calls.find((c) => c.table === 'notes')!.payload as { created_at: string }
    expect(toDayKey(new Date(note.created_at))).toBe(today)
  })
})
