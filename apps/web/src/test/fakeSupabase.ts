import { vi } from 'vitest'

type Err = { message: string } | null
type Call = { table: string; op: 'select' | 'insert' | 'upsert' | 'update' | 'delete'; payload?: unknown; filters: unknown[][] }

/**
 * A small in-memory stand-in for the Supabase client. Tests set `session`,
 * `profile`, `rows` (what a select on each table returns) and `counts`, and read `calls`
 * to see what the app asked for and wrote.
 */
export function createFakeSupabase() {
  const state = {
    session: null as null | { user: { id: string; email: string } },
    profile: null as Record<string, unknown> | null,
    rows: {} as Record<string, unknown[]>,
    /** What a head-only count on each table returns; defaults to the number of rows. */
    counts: {} as Record<string, number>,
    writeError: null as Err,
    calls: [] as Call[],
    nextId: 1,
  }

  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] }
    let single = false
    let maybeSingle = false
    let returning = false
    let head = false
    let range: [number, number] | null = null

    const result = () => {
      if (call.op === 'select') {
        if (table === 'profiles' && single) {
          return state.profile ? { data: state.profile, error: null } : { data: null, error: { message: 'not found' } }
        }
        // eq filters apply to rows that have the column, so tests only need the fields they care about.
        const rows = (state.rows[table] ?? []).filter((row) =>
          call.filters.every(([f, col, val]) => f !== 'eq' || typeof row !== 'object' || row === null || !(String(col) in row) || (row as Record<string, unknown>)[String(col)] === val),
        )
        if (head) return { data: null, count: state.counts[table] ?? rows.length, error: null }
        if (maybeSingle) return { data: rows[0] ?? null, error: null }
        return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null }
      }
      if (state.writeError) return { data: null, error: state.writeError }
      if (single) return { data: { id: `new-${state.nextId++}` }, error: null }
      // An insert read back without single() returns one row per inserted row.
      if (returning) return { data: (Array.isArray(call.payload) ? call.payload : [call.payload]).map(() => ({ id: `new-${state.nextId++}` })), error: null }
      return { data: null, error: null }
    }

    const builder: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
      single: () => {
        single = true
        return builder
      },
      maybeSingle: () => {
        maybeSingle = true
        return builder
      },
      range: (from: number, to: number) => {
        range = [from, to]
        return builder
      },
    }
    for (const op of ['insert', 'upsert', 'update', 'delete'] as const) {
      builder[op] = (payload?: unknown) => {
        call.op = op
        call.payload = payload
        state.calls.push(call)
        return builder
      }
    }
    // Reading back an insert keeps it a write; on its own, select starts a read.
    builder.select = (_columns?: string, options?: { head?: boolean }) => {
      head = options?.head ?? false
      if (call.op !== 'select') returning = true
      return builder
    }
    for (const f of ['eq', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'order', 'limit', 'ilike', 'textSearch']) {
      builder[f] = (...args: unknown[]) => {
        call.filters.push([f, ...args])
        return builder
      }
    }
    return builder as never
  }

  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: state.session }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null as Err })),
    signUp: vi.fn(() => Promise.resolve({ data: {}, error: null as Err })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null as Err })),
    updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null as Err })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  }

  const rpc = vi.fn<(fn: string, args?: unknown) => Promise<{ data: null; error: Err }>>(() => Promise.resolve({ data: null, error: null }))

  return { state, client: { auth, from, rpc } }
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>
