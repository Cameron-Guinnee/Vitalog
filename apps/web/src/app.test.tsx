import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
const onboardedProfile = { id: user.id, display_name: 'Alice', date_of_birth: '1995-04-02', sex: 'female', height_cm: 165, calorie_goal: 1900 }

beforeEach(() => {
  fake.current = createFakeSupabase()
})

describe('route guards', () => {
  it('sends signed-out visitors to the login page', async () => {
    const { router } = renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Vitalog' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('sends new users to onboarding', async () => {
    fake.current.state.session = { user }
    fake.current.state.profile = { id: user.id, display_name: user.email, date_of_birth: null, sex: null, height_cm: null }
    const { router } = renderApp('/dashboard')
    expect(await screen.findByText('Personal information')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('shows the dashboard to onboarded users, including from the login page', async () => {
    fake.current.state.session = { user }
    fake.current.state.profile = onboardedProfile
    const { router } = renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Welcome, Alice' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('shows a not-found page for unknown paths', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('login', () => {
  it('shows the error Supabase returns', async () => {
    fake.current.client.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } })
    renderApp('/login')
    await userEvent.type(await screen.findByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('asks for both fields before calling Supabase', async () => {
    renderApp('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email and password.')
    expect(fake.current.client.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('signup', () => {
  it('rejects mismatched passwords', async () => {
    renderApp('/signup')
    await userEvent.type(await screen.findByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'long-enough-1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'long-enough-2')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords don’t match.')
    expect(fake.current.client.auth.signUp).not.toHaveBeenCalled()
  })

  it('sends the confirmation link back to onboarding on this site', async () => {
    renderApp('/signup')
    await userEvent.type(await screen.findByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'long-enough-1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'long-enough-1')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email')
    expect(fake.current.client.auth.signUp).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'long-enough-1',
      options: { emailRedirectTo: 'https://vitalog.test/onboarding' },
    })
  })
})

describe('forgot password', () => {
  it('links the reset email to this site rather than localhost', async () => {
    renderApp('/forgot-password')
    await userEvent.type(await screen.findByLabelText('Email'), 'a@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await screen.findByRole('status')
    expect(fake.current.client.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@example.com', {
      redirectTo: 'https://vitalog.test/reset-password',
    })
  })
})

describe('reset password', () => {
  it('explains when the link has expired', async () => {
    renderApp('/reset-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
  })
})

describe('onboarding', () => {
  beforeEach(() => {
    fake.current.state.session = { user }
    fake.current.state.profile = { id: user.id, date_of_birth: null, sex: null, height_cm: null }
  })

  it('saves a metric user who wants to maintain their weight', async () => {
    const { router } = renderApp('/onboarding')

    await userEvent.type(await screen.findByLabelText('Display name'), 'Sam')
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-01-15')
    await userEvent.click(screen.getByRole('radio', { name: 'Female' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await userEvent.click(await screen.findByRole('radio', { name: /Metric/ }))
    await userEvent.type(screen.getByLabelText('Height (cm)'), '170')
    await userEvent.type(screen.getByLabelText('Current weight (kg)'), '65')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await userEvent.click(await screen.findByRole('radio', { name: /Lightly active/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Maintain weight' }))
    // The calorie goal is pre-filled from the estimate.
    expect(screen.getByLabelText('Daily calorie goal (kcal)')).not.toHaveValue(null)

    fake.current.state.profile = { ...onboardedProfile, display_name: 'Sam' }
    await userEvent.click(screen.getByRole('button', { name: 'Get started' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    const ops = fake.current.state.calls.map((c) => `${c.op} ${c.table}`)
    expect(ops).toEqual(['insert biometrics', 'upsert streaks', 'update profiles'])

    const profile = fake.current.state.calls[2]!.payload as Record<string, unknown>
    expect(profile).toMatchObject({
      display_name: 'Sam',
      sex: 'female',
      height_cm: 170,
      units_preference: 'metric',
      weight_goal_type: 'maintain',
      weight_goal: 65,
      weekly_rate: 0,
    })
    expect(fake.current.state.calls[0]!.payload).toMatchObject({ metric_type: 'weight', value: 65, unit: 'kg' })
  })

  it('stays on the form and explains when saving fails', async () => {
    fake.current.state.writeError = { message: 'boom' }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/onboarding')

    await userEvent.type(await screen.findByLabelText('Display name'), 'Sam')
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-01-15')
    await userEvent.click(screen.getByRole('radio', { name: 'Male' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.type(await screen.findByLabelText('Height, feet'), '5')
    await userEvent.type(screen.getByLabelText('Height, inches'), '10')
    await userEvent.type(screen.getByLabelText('Current weight (lb)'), '180')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(await screen.findByRole('radio', { name: /Sedentary/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Lose weight' }))
    await userEvent.click(screen.getByRole('radio', { name: /Lose 1 lb a week/ }))
    await userEvent.type(screen.getByLabelText('Target weight (lb)'), '165')
    await userEvent.click(screen.getByRole('button', { name: 'Get started' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    // Only the first write was attempted; the profile was never marked complete.
    expect(fake.current.state.calls.map((c) => c.table)).toEqual(['biometrics'])
  })
})
