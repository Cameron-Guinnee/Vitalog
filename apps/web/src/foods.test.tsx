import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NUTRIENT } from '@vitalog/shared'
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

// A custom food is per serving (1 cup, 120 kcal); a USDA food is per 100 g (40 g serving).
const granola = { id: 'c1', name: 'Homemade granola', brand: null, serving_size: 1, serving_unit: 'cup', archived_at: null }
const oats = { id: 'f1', name: 'Rolled oats', brand: null, is_verified: true, serving_size: 40, serving_unit: 'g' }
const rows = () => ({
  custom_foods: [{ ...granola, custom_food_nutrient_values: [{ nutrient_id: NUTRIENT.energy, value: 120 }, { nutrient_id: NUTRIENT.protein, value: 4 }] }],
  foods: [oats],
  custom_food_nutrient_values: [
    { custom_food_id: 'c1', nutrient_id: NUTRIENT.energy, value: 120 },
    { custom_food_id: 'c1', nutrient_id: NUTRIENT.protein, value: 4 },
  ],
  food_nutrient_values: [{ food_id: 'f1', nutrient_id: NUTRIENT.energy, value: 400 }],
})
const writes = (table: string) => fake.current.state.calls.filter((c) => c.table === table)

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
  fake.current.state.rows = rows()
})

describe('custom foods', () => {
  it('creates a food from its nutrition label', async () => {
    fake.current.state.rows = {}
    renderApp('/foods/custom-foods')
    await userEvent.click(await screen.findByRole('button', { name: 'New custom food' }))
    const dialog = screen.getByRole('dialog', { name: 'New custom food' })
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Protein bar')
    await userEvent.clear(within(dialog).getByLabelText('Serving size'))
    await userEvent.type(within(dialog).getByLabelText('Serving size'), '45')
    await userEvent.selectOptions(within(dialog).getByLabelText('Serving unit'), 'g')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save food' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter the calories per serving.')

    await userEvent.type(within(dialog).getByLabelText('Calories (kcal)'), '210')
    await userEvent.type(within(dialog).getByLabelText('Protein (g)'), '20')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save food' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(writes('custom_foods')[0]).toMatchObject({ op: 'insert', payload: { user_id: user.id, name: 'Protein bar', brand: null, serving_size: 45, serving_unit: 'g' } })
    expect(writes('custom_food_nutrient_values')[0]!.op).toBe('upsert')
    expect(writes('custom_food_nutrient_values')[0]!.payload).toEqual(
      expect.arrayContaining([
        { custom_food_id: 'new-1', nutrient_id: NUTRIENT.energy, value: 210 },
        { custom_food_id: 'new-1', nutrient_id: NUTRIENT.protein, value: 20 },
      ]),
    )
  })

  it('edits a food in place and removes nutrients that were cleared', async () => {
    renderApp('/foods/custom-foods')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Homemade granola' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit custom food' })
    expect(within(dialog).getByLabelText('Calories (kcal)')).toHaveValue(120)
    await userEvent.clear(within(dialog).getByLabelText('Protein (g)'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save food' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(writes('custom_foods')).toEqual([expect.objectContaining({ op: 'update', filters: [['eq', 'id', 'c1']] })])
    expect(writes('custom_food_nutrient_values').map((c) => [c.op, c.filters])).toEqual([
      ['upsert', []],
      ['delete', [['eq', 'custom_food_id', 'c1'], ['not', 'nutrient_id', 'in', `(${NUTRIENT.energy})`]]],
    ])
  })

  it('archives a food instead of deleting the days it was logged on', async () => {
    renderApp('/foods/custom-foods')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Homemade granola' }))
    const confirm = screen.getByRole('dialog', { name: 'Delete custom food' })
    expect(confirm).toHaveTextContent('keep it')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(writes('custom_foods')).toEqual([expect.objectContaining({ op: 'update', payload: { archived_at: expect.any(String) } })])
  })
})

describe('meals and recipes', () => {
  it('builds a meal from searched foods', async () => {
    renderApp('/foods/custom-meals')
    await userEvent.click(await screen.findByRole('button', { name: 'New meal' }))
    const dialog = screen.getByRole('dialog', { name: 'New meal' })
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Breakfast bowl')
    await userEvent.type(within(dialog).getByLabelText('Search foods'), 'oats{Enter}')
    await userEvent.click(await within(dialog).findByRole('button', { name: /Rolled oats/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Homemade granola/ }))
    await userEvent.clear(within(dialog).getByLabelText('Amount of Homemade granola'))
    await userEvent.type(within(dialog).getByLabelText('Amount of Homemade granola'), '0.5')
    // 40 g of oats (160 kcal) and half a cup of granola (60 kcal).
    expect(await within(within(dialog).getByLabelText('Nutrition for the meal')).findByText('220')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save meal' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(writes('custom_meals')[0]).toMatchObject({ op: 'insert', payload: { user_id: user.id, name: 'Breakfast bowl' } })
    expect(writes('custom_meal_items')[0]).toMatchObject({
      op: 'insert',
      payload: [
        { custom_meal_id: 'new-1', quantity: 1, food_id: 'f1', custom_food_id: null },
        { custom_meal_id: 'new-1', quantity: 0.5, food_id: null, custom_food_id: 'c1' },
      ],
    })
  })

  it('saves new recipe ingredients before removing the old ones', async () => {
    fake.current.state.rows.recipes = [
      {
        id: 'r1',
        name: 'Overnight oats',
        servings: 2,
        recipe_ingredients: [{ id: 'i1', quantity: 1, serving_unit: '100 g', food_id: 'f1', custom_food_id: null, foods: oats, custom_foods: null }],
      },
    ]
    renderApp('/foods/custom-recipes')
    const card = await screen.findByRole('region', { name: 'Overnight oats' })
    // 100 g of oats is 400 kcal, split over 2 servings.
    expect(await within(card).findByText('200')).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Edit Overnight oats' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit recipe' })
    await userEvent.clear(within(dialog).getByLabelText('Servings it makes'))
    await userEvent.type(within(dialog).getByLabelText('Servings it makes'), '4')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save recipe' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(writes('recipes')[0]).toMatchObject({ op: 'update', payload: { name: 'Overnight oats', servings: 4 } })
    expect(writes('recipe_ingredients').map((c) => c.op)).toEqual(['insert', 'delete'])
    expect(writes('recipe_ingredients')[0]!.payload).toEqual([{ recipe_id: 'r1', quantity: 1, serving_unit: '100 g', food_id: 'f1', custom_food_id: null }])
    expect(writes('recipe_ingredients')[1]!.filters).toEqual([['in', 'id', ['i1']]])
  })
})

describe('logging from the food dialog', () => {
  it('logs custom foods per serving, as on the label', async () => {
    renderApp('/diary')
    await userEvent.click(await screen.findByRole('button', { name: 'Food' }))
    const dialog = screen.getByRole('dialog', { name: 'Add food' })
    await userEvent.type(within(dialog).getByLabelText('Search foods'), 'granola{Enter}')
    await userEvent.click(await within(dialog).findByRole('button', { name: /Homemade granola/ }))
    expect(within(dialog).getByLabelText('Unit')).toHaveTextContent('serving (1 cup)')
    await userEvent.clear(within(dialog).getByLabelText('Amount'))
    await userEvent.type(within(dialog).getByLabelText('Amount'), '2')
    expect(await within(dialog).findByText('240')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to diary' }))
    await waitFor(() => expect(writes('diary_entries')).toHaveLength(1))
    expect(writes('diary_entries')[0]!.payload).toEqual([expect.objectContaining({ custom_food_id: 'c1', quantity: 2, serving_unit: 'cup' })])
  })

  it('logs a meal as one entry per food', async () => {
    fake.current.state.rows.custom_meals = [
      {
        id: 'm1',
        name: 'Breakfast bowl',
        custom_meal_items: [
          { id: 'a', quantity: 1, food_id: 'f1', custom_food_id: null, foods: oats, custom_foods: null },
          { id: 'b', quantity: 1, food_id: null, custom_food_id: 'c1', foods: null, custom_foods: granola },
        ],
      },
    ]
    renderApp('/diary')
    await userEvent.click(await screen.findByRole('button', { name: 'Food' }))
    const dialog = screen.getByRole('dialog', { name: 'Add food' })
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Meals' }))
    await userEvent.click(await within(dialog).findByRole('button', { name: /Breakfast bowl/ }))
    await userEvent.clear(within(dialog).getByLabelText('Portions'))
    await userEvent.type(within(dialog).getByLabelText('Portions'), '2')
    expect(await within(dialog).findByText('560')).toBeInTheDocument() // (160 + 120) × 2
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to diary' }))

    await waitFor(() => expect(writes('diary_nutrient_values')).toHaveLength(1))
    expect(writes('diary_entries')[0]!.payload).toEqual([
      expect.objectContaining({ food_id: 'f1', quantity: 2, serving_unit: 'serving' }),
      expect.objectContaining({ custom_food_id: 'c1', quantity: 2, serving_unit: 'cup' }),
    ])
    expect(writes('diary_nutrient_values')[0]!.payload).toEqual(
      expect.arrayContaining([
        { diary_entry_id: 'new-1', nutrient_id: NUTRIENT.energy, value: 320 },
        { diary_entry_id: 'new-2', nutrient_id: NUTRIENT.energy, value: 240 },
      ]),
    )
  })

  it('logs servings of a recipe', async () => {
    fake.current.state.rows.recipes = [
      {
        id: 'r1',
        name: 'Overnight oats',
        servings: 4,
        recipe_ingredients: [{ id: 'i1', quantity: 2, serving_unit: '100 g', food_id: 'f1', custom_food_id: null, foods: oats, custom_foods: null }],
      },
    ]
    renderApp('/diary')
    await userEvent.click(await screen.findByRole('button', { name: 'Food' }))
    const dialog = screen.getByRole('dialog', { name: 'Add food' })
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Recipes' }))
    await userEvent.click(await within(dialog).findByRole('button', { name: /Overnight oats/ }))
    expect(await within(dialog).findByText('200')).toBeInTheDocument() // 800 kcal ÷ 4 servings
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to diary' }))
    await waitFor(() => expect(writes('diary_nutrient_values')).toHaveLength(1))
    expect(writes('diary_entries')[0]!.payload).toEqual([expect.objectContaining({ recipe_id: 'r1', food_id: null, custom_food_id: null, quantity: 1 })])
  })
})

describe('repeat items and search', () => {
  it('lists what was logged most and logs it again with the last amount', async () => {
    fake.current.state.rows.diary_entries = [
      { id: 'e1', logged_at: '2026-11-07T12:00:00Z', quantity: 2, serving_unit: 'cup', recipe_id: null, food_id: null, custom_food_id: 'c1', foods: null, custom_foods: granola, recipes: null },
      { id: 'e2', logged_at: '2026-11-06T12:00:00Z', quantity: 1, serving_unit: 'cup', recipe_id: null, food_id: null, custom_food_id: 'c1', foods: null, custom_foods: granola, recipes: null },
      { id: 'e3', logged_at: '2026-11-05T12:00:00Z', quantity: 1, serving_unit: 'serving', recipe_id: null, food_id: 'f1', custom_food_id: null, foods: oats, custom_foods: null, recipes: null },
    ]
    renderApp('/foods/repeat-items')
    const list = await screen.findByRole('region', { name: 'Repeat items' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([expect.stringMatching(/^2×Homemade granola/), expect.stringMatching(/^1×Rolled oats/)])

    await userEvent.click(within(list).getByRole('button', { name: 'Log Homemade granola again' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add food' })
    expect(within(dialog).getByLabelText('Amount')).toHaveValue(2)
    expect(within(dialog).queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('shows a food’s full nutrition for an amount', async () => {
    renderApp('/foods/search')
    await userEvent.type(await screen.findByLabelText('Search foods'), 'oats{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: /Rolled oats/ }))
    const detail = await screen.findByRole('region', { name: 'Rolled oats' })
    expect(await within(detail).findByText('160')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Full nutrition' })).toBeInTheDocument()
  })
})
