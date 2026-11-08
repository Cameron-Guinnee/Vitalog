import { vi } from 'vitest'

type Result = { data?: unknown; error: { message: string } | null }

/**
 * A small in-memory stand-in for the Supabase client. Tests set `session` and
 * `profile`, and read `calls` to see what the app wrote.
 */
export function createFakeSupabase() {
  const state = {
    session: null as null | { user: { id: string; email: string } },
    profile: null as Record<string, unknown> | null,
    writeError: null as Result['error'],
    calls: [] as { table: string; op: string; payload?: unknown }[],
  }

  const ok = (data: unknown = null): Result => ({ data, error: null })

  function from(table: string) {
    const write = (op: string) => (payload?: unknown) => {
      state.calls.push({ table, op, payload })
      const result: Result = { data: null, error: state.writeError }
      const chain = { eq: () => Promise.resolve(result), then: (r: (v: Result) => void) => Promise.resolve(result).then(r) }
      return chain
    }
    return {
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve(table === 'profiles' && state.profile ? ok(state.profile) : { data: null, error: { message: 'not found' } }),
        }),
      }),
      insert: write('insert'),
      upsert: write('upsert'),
      update: write('update'),
    }
  }

  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: state.session }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null as Result['error'] })),
    signUp: vi.fn(() => Promise.resolve({ data: {}, error: null as Result['error'] })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null as Result['error'] })),
    updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null as Result['error'] })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  }

  return { state, client: { auth, from } }
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>
