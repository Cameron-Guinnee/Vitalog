// PostgREST returns at most 1000 rows per request, so longer ranges are read in pages.
export const PAGE_SIZE = 1000

/** Calls `page` with successive row ranges until a page comes back short, and returns every row. */
export async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
