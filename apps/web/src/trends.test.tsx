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
    subscription_tier: 'free',
    display_settings: {},
  }
})

describe('charts', () => {
  it('charts a biometric in the user’s units and deletes a reading', async () => {
    fake.current.state.rows = {
      biometrics: [
        { id: 'w1', metric_type: 'weight', logged_at: timestampForDay(addDays(today, -10)), value: 182, unit: 'lbs', notes: null },
        { id: 'w2', metric_type: 'weight', logged_at: timestampForDay(addDays(today, -1)), value: 80, unit: 'kg', notes: 'after holiday' },
      ],
    }
    renderApp('/trends/charts')
    const history = await screen.findByRole('region', { name: 'History' })
    expect(within(history).getByText('176.4 lbs')).toBeInTheDocument()
    expect(within(history).getByText(/after holiday/)).toBeInTheDocument()
    const chart = screen.getByRole('region', { name: 'Weight' })
    expect(within(chart).getByText('179.2 lbs')).toBeInTheDocument() // average
    expect(within(chart).getByText('−5.6 lbs')).toBeInTheDocument() // change

    const rows = within(history).getAllByRole('listitem')
    await userEvent.click(within(rows[0]!).getByRole('button', { name: /Delete reading/ }))
    await waitFor(() => expect(fake.current.state.calls).toContainEqual(expect.objectContaining({ table: 'biometrics', op: 'delete', filters: [['in', 'id', ['w2']]] })))
  })

  it('switches metric and says when there is nothing logged', async () => {
    renderApp('/trends/charts')
    await userEvent.click(await screen.findByRole('tab', { name: 'Heart rate' }))
    expect(await screen.findByText('No heart rate readings in this range.')).toBeInTheDocument()
  })
})

describe('nutrition report', () => {
  it('averages the days with food and lists each day', async () => {
    const food = (day: string, kcal: number, protein: number) => ({
      id: day,
      logged_at: timestampForDay(day),
      diary_nutrient_values: [
        { nutrient_id: NUTRIENT.energy, value: kcal },
        { nutrient_id: NUTRIENT.protein, value: protein },
      ],
    })
    fake.current.state.rows = { diary_entries: [food(today, 1800, 100), food(addDays(today, -2), 2400, 60)] }
    renderApp('/trends/nutrition-report')
    const summary = await screen.findByRole('region', { name: 'Summary' })
    expect(within(summary).getByText('2 of 7')).toBeInTheDocument()
    expect(within(summary).getByText('2100 kcal')).toBeInTheDocument()
    expect(within(summary).getByText('1 of 2')).toBeInTheDocument() // days at or under goal
    expect(within(screen.getByRole('region', { name: 'Day by day' })).getAllByRole('row')).toHaveLength(3)
    expect(within(screen.getByRole('region', { name: 'Daily averages' })).getByText('80.0 g')).toBeInTheDocument()
  })
})

describe('print report', () => {
  it('checks the dates before building', async () => {
    renderApp('/trends/print-report')
    const from = await screen.findByLabelText('From')
    await userEvent.clear(from)
    await userEvent.type(from, addDays(today, 1))
    await userEvent.click(screen.getByRole('button', { name: 'Build report' }))
    expect(screen.getByRole('alert')).toHaveTextContent('The start date must be on or before the end date.')
  })

  it('builds a report with custom foods and fasts, then prints it', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const started = new Date(Date.now() - 20 * 3_600_000).toISOString()
    fake.current.state.rows = {
      diary_entries: [
        {
          id: 'e1',
          logged_at: timestampForDay(today),
          quantity: 2,
          serving_unit: 'slice',
          foods: null,
          custom_foods: { name: 'Grandma’s bread' },
          diary_nutrient_values: [{ nutrient_id: NUTRIENT.energy, value: 240 }],
        },
      ],
      fasting_log: [{ id: 'f1', started_at: started, ended_at: new Date(Date.parse(started) + 16.5 * 3_600_000).toISOString(), target_duration_hours: 16 }],
    }
    renderApp('/trends/print-report')
    await userEvent.click(await screen.findByLabelText('Fasting sessions'))
    await userEvent.click(screen.getByRole('button', { name: 'Build report' }))

    const report = await screen.findByRole('article', { name: 'Report preview' })
    expect(within(report).getByText('Grandma’s bread')).toBeInTheDocument()
    expect(within(report).getByText('16.5')).toBeInTheDocument()
    expect(fake.current.state.calls).toEqual([]) // reports only read

    await userEvent.click(screen.getByRole('button', { name: /Print or save as PDF/ }))
    expect(print).toHaveBeenCalled()
  })
})

describe('snapshots', () => {
  it('saves the latest value of each logged biometric with the note', async () => {
    fake.current.state.rows = { biometrics: [{ metric_type: 'weight', value: 180, unit: 'lbs' }] }
    renderApp('/trends/snapshots')
    await userEvent.type(await screen.findByLabelText('Note (optional)'), 'Start of cut')
    await userEvent.click(screen.getByRole('button', { name: 'Take snapshot' }))
    expect(await screen.findByText('Snapshot saved with 1 measurement.')).toBeInTheDocument()
    expect(fake.current.state.calls).toContainEqual(
      expect.objectContaining({
        table: 'biometric_snapshots',
        op: 'insert',
        payload: { user_id: user.id, metrics: { weight: { value: 180, unit: 'lbs' } }, note: 'Start of cut' },
      }),
    )
  })

  it('explains that a biometric is needed first', async () => {
    renderApp('/trends/snapshots')
    await userEvent.click(await screen.findByRole('button', { name: 'Take snapshot' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Log a biometric first')
    expect(fake.current.state.calls).toEqual([])
  })

  it('shows each snapshot with its change since the one before', async () => {
    fake.current.state.rows = {
      biometric_snapshots: [
        { id: 's2', created_at: '2026-11-01T12:00:00Z', note: 'Week 4', metrics: { weight: { value: 176, unit: 'lbs' } } },
        { id: 's1', created_at: '2026-10-01T12:00:00Z', note: null, metrics: { weight: { value: 180, unit: 'lbs' } } },
      ],
    }
    renderApp('/trends/snapshots')
    const latest = await screen.findByRole('region', { name: /Snapshot from Nov 1, 2026/ })
    expect(within(latest).getByText('Week 4')).toBeInTheDocument()
    expect(within(latest).getByText('−4 since last')).toBeInTheDocument()

    await userEvent.click(within(latest).getByRole('button', { name: /Delete snapshot/ }))
    await waitFor(() =>
      expect(fake.current.state.calls).toContainEqual(expect.objectContaining({ table: 'biometric_snapshots', op: 'delete', filters: [['eq', 'id', 's2']] })),
    )
  })
})
