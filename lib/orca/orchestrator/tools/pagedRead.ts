/**
 * Read every row a PostgREST query matches, past the 1,000-rows-per-request
 * cap. Audit 2026-10-06: tools asked for .limit(4000) / .limit(6000) and
 * silently got 1,000 rows, so whale totals, counts and rankings came from a
 * fraction of the window (7 days is ~33,000 rows).
 *
 * The first page is read on its own; the rest in parallel batches until a
 * short page or maxRows. Callers must order by a unique tie-breaker after the
 * sort column (e.g. `.order('usd_value', …).order('id', …)`), or rows tied on
 * value can repeat or go missing across pages; rows are also de-duplicated on
 * id + transaction_hash. Clients without .range() (test stubs) get one capped
 * read.
 */
export const PAGE_SIZE = 1000

export interface PagedRead {
  data: any[] | null
  error: any
  /** false when maxRows was reached or a later page failed. */
  complete: boolean
}

export async function readAllRows(
  query: () => any,
  opts: { maxRows: number; concurrency?: number }
): Promise<PagedRead> {
  const first = query()
  if (typeof first.range !== 'function') {
    const { data, error } = await first.limit(opts.maxRows)
    return { data: Array.isArray(data) ? data : null, error, complete: true }
  }
  const rows: any[] = []
  const seen = new Set<string>()
  const add = (page: any[]) => {
    for (const r of page) {
      if (r?.id != null) {
        const key = `${r.id}|${r.transaction_hash ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)
      }
      rows.push(r)
    }
  }

  const { data: d0, error: e0 } = await first.range(0, PAGE_SIZE - 1)
  if (e0) return { data: null, error: e0, complete: false }
  const p0 = Array.isArray(d0) ? d0 : []
  add(p0)
  if (p0.length < PAGE_SIZE) return { data: rows, error: null, complete: true }

  const concurrency = Math.max(1, opts.concurrency ?? 6)
  let from = PAGE_SIZE
  while (from < opts.maxRows) {
    const starts: number[] = []
    for (let i = 0; i < concurrency && from + i * PAGE_SIZE < opts.maxRows; i++) starts.push(from + i * PAGE_SIZE)
    const pages = await Promise.all(
      starts.map((s) =>
        Promise.resolve(query().range(s, s + PAGE_SIZE - 1)).then(
          (r: any) => r,
          (error: any) => ({ data: null, error })
        )
      )
    )
    for (const pg of pages) {
      // A failed later page keeps the rows already read (the biggest ones).
      if (pg?.error) return { data: rows, error: null, complete: false }
      const arr = Array.isArray(pg?.data) ? pg.data : []
      add(arr)
      if (arr.length < PAGE_SIZE) return { data: rows, error: null, complete: true }
    }
    from += starts.length * PAGE_SIZE
  }
  return { data: rows, error: null, complete: false }
}
