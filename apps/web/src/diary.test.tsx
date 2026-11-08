import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NUTRIENT, toDayKey } from '@vitalog/shared'
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
    subscription_tier: 'free',
    display_settings: {},
  }
})

describe('diary', () => {
  it('shows the day’s entries in their groups with energy totals', async () => {
    fake.current.state.rows = {
      diary_entries: [
        {
          id: 'e1',
          meal_group: 1,
          quantity: 1,
          serving_unit: 'cup',
          foods: { name: 'Oatmeal' },
          custom_foods: null,
          diary_nutrient_values: [
            { nutrient_id: NUTRIENT.energy, value: 300 },
            { nutrient_id: NUTRIENT.protein, value: 10 },
          ],
        },
      ],
      exercise_log: [{ id: 'x1', exercise_name: 'Running', duration_minutes: 30, calories_burned: 250, meal_group: 3 }],
      notes: [{ id: 'n1', content: 'Felt great', meal_group: 7 }],
    }
    renderApp('/diary')

    const breakfast = await screen.findByRole('region', { name: 'Breakfast' })
    expect(within(breakfast).getByText('Oatmeal')).toBeInTheDocument()
    expect(within(breakfast).getByText('1 cup')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Dinner' })).getByText('Running')).toBeInTheDocument()
    // A note in a disabled group still shows, under the first group.
    expect(within(screen.getByRole('region', { name: 'Uncategorized' })).getByText('Felt great')).toBeInTheDocument()

    const summary = screen.getByRole('region', { name: 'Energy summary' })
    expect(within(summary).getByText('300 / 2000 kcal')).toBeInTheDocument()
    // 2000 goal - 300 eaten + 250 burned
    expect(within(summary).getByText('1950')).toBeInTheDocument()
  })

  it('opens on the day in the URL', async () => {
    renderApp('/diary?date=2026-11-01')
    expect(await screen.findByText('Sun, Nov 1, 2026')).toBeInTheDocument()
  })

  it('adds a food to the day being viewed, scaled to the amount eaten', async () => {
    fake.current.state.rows = {
      foods: [{ id: 'f1', name: 'Rolled oats', brand: null, is_verified: true, serving_size: 40, serving_unit: 'g' }],
      food_nutrient_values: [
        { nutrient_id: NUTRIENT.energy, value: 389 },
        { nutrient_id: NUTRIENT.protein, value: 16.9 },
      ],
    }
    renderApp('/diary?date=2026-11-01')

    await userEvent.click(await screen.findByRole('button', { name: 'Food' }))
    const dialog = screen.getByRole('dialog', { name: 'Add food' })
    await userEvent.type(within(dialog).getByLabelText('Search foods'), 'oats')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Search' }))
    await userEvent.click(await within(dialog).findByRole('button', { name: /Rolled oats/ }))

    await within(dialog).findByText('156') // one 40 g serving: 389 × 0.4
    await userEvent.clear(within(dialog).getByLabelText('Amount'))
    await userEvent.type(within(dialog).getByLabelText('Amount'), '2')
    await userEvent.selectOptions(within(dialog).getByLabelText('Unit'), '100g')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to diary' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [entry, nutrients] = fake.current.state.calls
    expect(entry).toMatchObject({
      table: 'diary_entries',
      op: 'insert',
      payload: { user_id: user.id, food_id: 'f1', custom_food_id: null, meal_group: 1, meal_type: 'breakfast', quantity: 2, serving_unit: '100 g' },
    })
    expect(toDayKey(new Date((entry!.payload as { logged_at: string }).logged_at))).toBe('2026-11-01')
    expect(nutrients).toMatchObject({ table: 'diary_nutrient_values', op: 'insert' })
    expect(nutrients!.payload).toEqual(
      expect.arrayContaining([
        { diary_entry_id: 'new-1', nutrient_id: NUTRIENT.energy, value: 778 },
        { diary_entry_id: 'new-1', nutrient_id: NUTRIENT.protein, value: expect.closeTo(33.8) },
      ]),
    )
  })

  it('removes the entry it was not able to finish saving', async () => {
    fake.current.state.rows = {
      foods: [{ id: 'f1', name: 'Rolled oats', brand: null, is_verified: true, serving_size: null, serving_unit: null }],
      food_nutrient_values: [{ nutrient_id: NUTRIENT.energy, value: 389 }],
    }
    renderApp('/diary')
    await userEvent.click(await screen.findByRole('button', { name: 'Food' }))
    const dialog = screen.getByRole('dialog', { name: 'Add food' })
    await userEvent.type(within(dialog).getByLabelText('Search foods'), 'oats{Enter}')
    await userEvent.click(await within(dialog).findByRole('button', { name: /Rolled oats/ }))
    await within(dialog).findByText('389')

    // Let the entry insert succeed, then fail the nutrient insert.
    const from = fake.current.client.from
    let writes = 0
    fake.current.client.from = ((table: string) => {
      const b = from(table) as Record<string, (...a: unknown[]) => unknown>
      const insert = b.insert!
      b.insert = (p: unknown) => {
        if (++writes === 2) fake.current.state.writeError = { message: 'boom' }
        return insert(p)
      }
      return b
    }) as typeof from
    const restore = () => (fake.current.state.writeError = null)
    const del = fake.current.client.from
    fake.current.client.from = ((table: string) => {
      const b = del(table) as Record<string, (...a: unknown[]) => unknown>
      const d = b.delete!
      b.delete = () => (restore(), d())
      return b
    }) as typeof from

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to diary' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Couldn’t add this food')
    expect(fake.current.state.calls.map((c) => `${c.op} ${c.table}`)).toEqual([
      'insert diary_entries',
      'insert diary_nutrient_values',
      'delete diary_entries',
    ])
  })

  it('deletes an entry from the right table', async () => {
    fake.current.state.rows = { exercise_log: [{ id: 'x1', exercise_name: 'Rowing', duration_minutes: 20, calories_burned: 150, meal_group: 0 }] }
    renderApp('/diary')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Rowing' }))
    await waitFor(() => expect(fake.current.state.calls).toHaveLength(1))
    expect(fake.current.state.calls[0]).toMatchObject({ table: 'exercise_log', op: 'delete', filters: [['eq', 'id', 'x1']] })
  })

  it('adds a note to the chosen group', async () => {
    renderApp('/diary?date=2026-11-01')
    await userEvent.click(await screen.findByRole('button', { name: 'Note' }))
    const dialog = screen.getByRole('dialog', { name: 'Add note' })
    await userEvent.type(within(dialog).getByLabelText('Note'), 'Ate late')
    await userEvent.selectOptions(within(dialog).getByLabelText('Diary group'), 'Dinner')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save note' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fake.current.state.calls[0]).toMatchObject({ table: 'notes', op: 'insert', payload: { user_id: user.id, content: 'Ate late', meal_group: 3 } })
  })

  it('moves between days through the URL', async () => {
    const { router } = renderApp('/diary?date=2026-11-01')
    await userEvent.click(await screen.findByRole('button', { name: 'Previous day' }))
    expect(router.state.location.search).toBe('?date=2026-10-31')
    await userEvent.click(screen.getByRole('button', { name: /Today/ }))
    expect(router.state.location.search).toBe('')
  })
})

describe('app shell', () => {
  it('links to every section, with placeholders for screens not ported yet', async () => {
    const { router } = renderApp('/diary')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    await userEvent.click(within(nav).getByRole('button', { name: 'Trends' }))
    await userEvent.click(within(nav).getByRole('link', { name: 'Charts' }))
    expect(router.state.location.pathname).toBe('/trends/charts')
    expect(screen.getByRole('heading', { name: 'Charts' })).toBeInTheDocument()
    expect(screen.getByText(/being rebuilt/)).toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    renderApp('/diary')
    await userEvent.click(await screen.findByRole('button', { name: 'Account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(fake.current.client.auth.signOut).toHaveBeenCalled()
  })
})
