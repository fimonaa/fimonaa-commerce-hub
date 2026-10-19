import { useCallback, useEffect, useState } from 'react'

type DashboardSummary = {
  totalSkus?: number
  totalSKUs?: number
  total_skus?: number
  availableStock?: number
  available_stock?: number
  lowStock?: number
  low_stock?: number
  outOfStock?: number
  out_of_stock?: number
  [key: string]: unknown
}

const API_URL = 'http://localhost:3000/api/dashboard/summary'

function getMetric(
  data: DashboardSummary | null,
  keys: string[],
): string {
  if (!data) return '—'

  for (const key of keys) {
    const value = data[key]

    if (typeof value === 'number') {
      return value.toLocaleString()
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }

  return '—'
}

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: string
  className?: string
}) {
  const paths: Record<string, string> = {
    dashboard:
      'M3 3h7v7H3z M14 3h7v4h-7z M14 10h7v11h-7z M3 14h7v7H3z',
    inventory:
      'M3 7 12 2l9 5-9 5-9-5Z M3 12l9 5 9-5 M3 17l9 5 9-5',
    activity:
      'M3 12h4l3-8 4 16 3-8h4',
    imports:
      'M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4',
    search:
      'm20 20-4.5-4.5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
    refresh:
      'M20 7v5h-5 M4 17v-5h5 M5.6 9a7 7 0 0 1 11.7-2L20 12 M4 12l2.7 5a7 7 0 0 0 11.7-2',
    arrow:
      'M5 12h14 M13 6l6 6-6 6',
    alert:
      'M12 9v4m0 4h.01 M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z',
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[name] ?? paths.dashboard} />
    </svg>
  )
}

const navigation = [
  { label: 'Dashboard', icon: 'dashboard', active: true },
  { label: 'Inventory', icon: 'inventory', active: false },
  { label: 'Stock Movements', icon: 'activity', active: false },
  { label: 'Imports', icon: 'imports', active: false },
]

const metrics = [
  {
    label: 'Total SKUs',
    keys: ['totalSkus', 'totalSKUs', 'total_skus'],
    description: 'Products in your catalogue',
    icon: 'inventory',
    iconStyle: 'bg-[#f9e8ef] text-[#ad3a68]',
  },
  {
    label: 'Available stock',
    keys: ['availableStock', 'available_stock'],
    description: 'Units available to sell',
    icon: 'activity',
    iconStyle: 'bg-[#fff0e7] text-[#b76d42]',
  },
  {
    label: 'Low stock',
    keys: ['lowStockSkus', 'lowStock', 'low_stock_skus', 'low_stock'],
    description: 'Items to review',
    icon: 'alert',
    iconStyle: 'bg-[#fff5dd] text-[#a67b22]',
  },
  {
    label: 'Out of stock',
    keys: [
      'outOfStockSkus',
      'outOfStock',
      'out_of_stock_skus',
      'out_of_stock',
    ],
    description: 'Items needing replenishment',
    icon: 'imports',
    iconStyle: 'bg-[#f0edef] text-[#6e6469]',
  },
]

function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}.`)
      }

      const result: unknown = await response.json()

      const payload =
        result &&
        typeof result === 'object' &&
        'data' in result
          ? (result as { data: unknown }).data
          : result

      if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
      ) {
        throw new Error('The dashboard API returned an unexpected response.')
      }

      setSummary(payload as DashboardSummary)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load dashboard data.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
  let cancelled = false

  const fetchSummary = async () => {
    setError('')

    try {
      const response = await fetch(`${API_URL}/dashboard/summary`)

      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}.`)
      }

      const result: unknown = await response.json()

      const payload =
        result &&
        typeof result === 'object' &&
        'data' in result
          ? (result as { data: unknown }).data
          : result

      if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
      ) {
        throw new Error(
          'The dashboard API returned an unexpected response.',
        )
      }

      if (!cancelled) {
        setSummary(payload as DashboardSummary)
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load dashboard data.',
        )
      }
    } finally {
      if (!cancelled) {
        setLoading(false)
      }
    }
  }

  void fetchSummary()

  return () => {
    cancelled = true
  }
}, [])

  return (
    <div className="min-h-screen bg-[#faf7f5] text-[#292326]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#eee5e4] bg-white lg:flex">
        <div className="flex h-24 items-center gap-3 border-b border-[#f1e9e8] px-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8e7ee] text-lg font-semibold text-[#a92f62]">
            F
          </div>

          <div>
            <p className="text-lg font-semibold tracking-tight">Fimonaa</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a92f62]">
              Commerce Hub
            </p>
          </div>
        </div>

        <div className="px-5 pt-8">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a69a9c]">
            Workspace
          </p>

          <nav aria-label="Main navigation" className="mt-3 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-current={item.active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  item.active
                    ? 'bg-[#f9eaf0] font-semibold text-[#a92f62]'
                    : 'text-[#756b6e] hover:bg-[#faf5f6]'
                }`}
              >
                <Icon name={item.icon} />
                {item.label}

                {item.active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b6386d]" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-5">
          <div className="rounded-2xl bg-[#faf4f3] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Inventory workspace
            </div>

            <p className="mt-2 text-xs leading-5 text-[#887c7f]">
              Your stock overview, designed to keep every channel in sync.
            </p>
          </div>

          <p className="mt-5 px-1 text-[10px] text-[#b0a5a7]">
            FIMONAA COMMERCE HUB · V1.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen lg:pl-64">
        {/* Header */}
        <header className="flex min-h-24 flex-wrap items-center justify-between gap-4 border-b border-[#eee5e4] bg-white/80 px-5 py-5 backdrop-blur sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium text-[#a09295]">
              Workspace / Overview
            </p>

            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
              Inventory dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#eee5e4] bg-white px-3 py-2 text-xs text-[#7f7377] sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              India inventory
            </div>

            <button
              type="button"
              onClick={() => void loadSummary()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e9dfe1] bg-white px-4 py-2.5 text-sm font-medium text-[#594d51] shadow-sm hover:border-[#d9a5b8] disabled:opacity-60"
            >
              <Icon name="refresh" />
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5dce6] text-sm font-semibold text-[#9d315e]"
              aria-label="Fimonaa workspace"
            >
              F
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          {/* Welcome banner */}
          <section className="relative overflow-hidden rounded-3xl bg-[#34272d] px-6 py-7 text-white sm:px-9 sm:py-9">
            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#edb5ca]">
                Your business at a glance
              </p>

              <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                Good to see you back.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#dfd0d5]">
                A clearer view of your inventory starts here. Monitor your
                catalogue, keep stock healthy, and build confidently across
                sales channels.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -right-2 -top-12 h-52 w-52 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute right-12 top-10 h-28 w-28 rounded-full bg-[#b6386d]/30 blur-3xl"
            />
          </section>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              <span>
                Could not load live summary: {error}
              </span>

              <button
                type="button"
                onClick={() => void loadSummary()}
                className="font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Summary cards */}
          <section aria-labelledby="metrics-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="metrics-heading" className="text-base font-semibold">
                  Stock overview
                </h2>

                <p className="mt-1 text-xs text-[#96898d]">
                  A live snapshot from your inventory service
                </p>
              </div>

              <span className="text-xs text-[#a09295]">
                {loading
                  ? 'Updating…'
                  : summary
                    ? 'Connected response received'
                    : 'Awaiting connection'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const value = getMetric(summary, metric.keys)

                return (
                  <article
                    key={metric.label}
                    className="rounded-2xl border border-[#eee5e4] bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[#827579]">
                        {metric.label}
                      </p>

                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.iconStyle}`}
                      >
                        <Icon name={metric.icon} />
                      </span>
                    </div>

                    <p className="mt-5 text-3xl font-semibold tracking-tight">
                      {loading && !summary ? (
                        <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-[#f3edef]" />
                      ) : (
                        value
                      )}
                    </p>

                    <p className="mt-2 text-xs text-[#a09295]">
                      {metric.description}
                    </p>
                  </article>
                )
              })}
            </div>
          </section>

          {/* Inventory and activity */}
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
            {/* Inventory catalogue */}
            <article className="overflow-hidden rounded-2xl border border-[#eee5e4] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f1e9e8] px-5 py-5 sm:px-6">
                <div>
                  <h2 className="font-semibold">Inventory catalogue</h2>
                  <p className="mt-1 text-xs text-[#96898d]">
                    Find and review individual SKUs
                  </p>
                </div>

                <span className="rounded-full bg-[#f8e7ee] px-3 py-1.5 text-[11px] font-semibold text-[#a92f62]">
                  SKU register
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <label htmlFor="inventory-search" className="sr-only">
                  Search inventory by SKU or product name
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-[#eee5e4] bg-[#fdfbfa] px-3.5 py-3">
                  <span className="text-[#a09295]">
                    <Icon name="search" />
                  </span>

                  <input
                    id="inventory-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by SKU or product name…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#b0a5a7]"
                  />

                  <kbd className="hidden rounded border border-[#e9dfe1] bg-white px-1.5 py-1 text-[10px] text-[#a09295] sm:inline">
                    SKU
                  </kbd>
                </div>

                <div className="mt-5 rounded-xl border border-dashed border-[#e6dadd] bg-[#fdfbfa] px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8e7ee] text-[#a92f62]">
                    <Icon name="inventory" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold">
                    Your inventory list is next
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#96898d]">
                    {search
                      ? `Searching for “${search}”. `
                      : ''}
                    The catalogue table will populate when we connect the SKU
                    listing endpoint. No sample products are shown here.
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] text-[#817579] ring-1 ring-[#eee5e4]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c08aa0]" />
                    Waiting for inventory endpoint
                  </span>
                </div>
              </div>
            </article>

            {/* Right column */}
            <div className="space-y-6">
              <article className="rounded-2xl border border-[#eee5e4] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Recent stock activity</h2>
                    <p className="mt-1 text-xs text-[#96898d]">
                      Latest inventory movements
                    </p>
                  </div>

                  <span className="rounded-lg bg-[#f8e7ee] p-2 text-[#a92f62]">
                    <Icon name="activity" />
                  </span>
                </div>

                <div className="mt-5 rounded-xl bg-[#fdfbfa] px-4 py-5 text-center">
                  <p className="text-sm font-medium text-[#594d51]">
                    Activity feed coming next
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-[#96898d]">
                    We will connect this panel to the stock movements API so
                    every adjustment is traceable.
                  </p>
                </div>
              </article>

              <article className="rounded-2xl border border-[#eee5e4] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Opening balance import</h2>
                    <p className="mt-1 text-xs text-[#96898d]">
                      Initial inventory setup
                    </p>
                  </div>

                  <span className="rounded-lg bg-[#edf7f0] p-2 text-emerald-700">
                    <Icon name="imports" />
                  </span>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#f7f5f3] p-4">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                  <div>
                    <p className="text-sm font-semibold">
                      Opening balance recorded
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#887c7f]">
                      The initial stock import has been completed. We will
                      display the exact import timestamp and quantity once
                      the import-history endpoint is connected.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#f1e9e8] pt-4">
                  <span className="text-xs text-[#96898d]">
                    Import history
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#a92f62]">
                    Coming soon
                    <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </div>
              </article>
            </div>
          </section>

          {/* Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eee5e4] pt-5 text-[11px] text-[#a09295]">
            <span>Fimonaa Commerce Hub · Inventory workspace</span>
            <span>Built for clear, dependable stock management</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App