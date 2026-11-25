import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/useAuth";
import MainLayout from "../../../layouts/MainLayout";
import { getInventory } from "../services/inventory.service";
import type {
  InventoryItem,
  InventoryListResponse,
  InventoryStockStatus,
} from "../types/inventory.types";

const PAGE_SIZE = 25;

const stockFilters: Array<{
  label: string;
  value: InventoryStockStatus;
}> = [
  { label: "All inventory", value: "all" },
  { label: "In stock", value: "in_stock" },
  { label: "Low stock", value: "low_stock" },
  { label: "Out of stock", value: "out_of_stock" },
];

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatQuantity(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-IN");
}

function StatusBadge({ status }: { status: InventoryItem["stockStatus"] }) {
  const styles = {
    in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    low_stock: "bg-amber-50 text-amber-800 ring-amber-200",
    out_of_stock: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  const labels = {
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | undefined;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-[#eee5e4] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#827579]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">
        {value === undefined ? "—" : value.toLocaleString("en-IN")}
      </p>
      <p className="mt-2 text-xs text-[#a09295]">{description}</p>
    </article>
  );
}

export default function InventoryPage() {
  const { accessToken, selectedBusiness } = useAuth();
  const businessId = selectedBusiness?.id;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<InventoryStockStatus>("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<InventoryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Incrementing this value triggers a fresh request without changing
  // the current search, stock filter, or page.
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce search so we don't send a request for every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Fetch the selected page and filters from the backend.
  // Abort the previous request when search, filter, or page changes.
  useEffect(() => {
    const controller = new AbortController();

    // Clear inventory from the previously selected business.
    setResult(null);
    setError("");

    if (!accessToken || !businessId) {
      setLoading(false);
      return () => controller.abort();
    }

    async function loadInventory() {
      setLoading(true);

      try {
        const response = await getInventory(
          {
            search,
            stockStatus,
            page,
            limit: PAGE_SIZE,
          },
          {
            accessToken: accessToken!,
            businessId: businessId!,
            signal: controller.signal,
          },
        );

        if (!controller.signal.aborted) {
          setResult(response);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Could not load inventory.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadInventory();

    return () => controller.abort();
  }, [accessToken, businessId, search, stockStatus, page, refreshKey]);

  // Changing this value triggers the existing loading effect.
  // This reuses its cancellation and error-handling behaviour.
  function refreshInventory() {
    setRefreshKey((current) => current + 1);
  }

  const meta = result?.meta;
  const items = result?.data ?? [];
  const totalPages = meta?.totalPages ?? 0;

  // An unfiltered empty result indicates that the workspace has no SKUs.
  // Filtered results may be empty even when inventory exists.
  const hasActiveFilters = search.trim() !== "" || stockStatus !== "all";
  const hasNoResults = !loading && !error && meta?.totalItems === 0;
  const startItem =
    meta && meta.totalItems > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const endItem = meta ? Math.min(meta.page * meta.limit, meta.totalItems) : 0;

  return (
    <MainLayout
      activePage="inventory"
      onRefresh={refreshInventory}
      loading={loading}
    >
      <div className="mx-auto max-w-[1500px] space-y-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a92f62]">
            Inventory control
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Inventory catalogue
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#887c7f]">
                Search your SKUs, review available quantities, and identify
                products that need replenishment.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-2 text-xs text-[#756b6e] ring-1 ring-[#eee5e4]">
              Read-only inventory
            </span>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <span>Could not load inventory: {error}</span>
            <button
              type="button"
              onClick={refreshInventory}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <section
          aria-label="Inventory summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryCard
            label="Total matching SKUs"
            value={meta?.totalItems}
            description="Items matching the current search and filter"
          />
          {hasNoResults ? (
            <article className="rounded-2xl border border-[#eee5e4] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#827579]">
                Current page
              </p>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                No pages
              </p>
              <p className="mt-2 text-xs text-[#a09295]">
                No inventory records to display
              </p>
            </article>
          ) : (
            <SummaryCard
              label="Current page"
              value={meta?.page}
              description={`Page size: ${PAGE_SIZE} records`}
            />
          )}
          <SummaryCard
            label="Total pages"
            value={meta?.totalPages}
            description="Based on the current results"
          />
          <SummaryCard
            label="Available units on this page"
            value={
              result
                ? result.data.reduce(
                    (total, item) => total + item.availableStock,
                    0,
                  )
                : undefined
            }
            description="Sum of available stock on this page only"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#eee5e4] bg-white shadow-sm">
          <div className="space-y-5 border-b border-[#f1e9e8] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">SKU register</h3>
                <p className="mt-1 text-xs text-[#96898d]">
                  Inventory records from the live inventory service
                </p>
              </div>

              <span className="rounded-full bg-[#f8e7ee] px-3 py-1.5 text-[11px] font-semibold text-[#a92f62]">
                {meta
                  ? `${meta.totalItems.toLocaleString("en-IN")} results`
                  : "Loading"}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#756b6e]">
                  Search catalogue
                </span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by SKU or product name…"
                  className="w-full rounded-xl border border-[#e9dfe1] bg-[#fdfbfa] px-4 py-3 text-sm outline-none transition placeholder:text-[#b0a5a7] focus:border-[#c87898] focus:ring-2 focus:ring-[#f8e7ee]"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-semibold text-[#756b6e]">
                  Stock status
                </span>
                <div className="flex flex-wrap gap-2">
                  {stockFilters.map((filter) => {
                    const active = stockStatus === filter.value;

                    return (
                      <button
                        key={filter.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setStockStatus(filter.value);
                          setPage(1);
                        }}
                        className={`rounded-xl px-3 py-3 text-xs font-medium transition ${
                          active
                            ? "bg-[#34272d] text-white"
                            : "border border-[#e9dfe1] bg-white text-[#756b6e] hover:border-[#d9a5b8]"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[#fdfbfa]">
                <tr className="border-b border-[#f1e9e8] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#96898d]">
                  <th scope="col" className="px-5 py-4">
                    SKU
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Product name
                  </th>
                  <th scope="col" className="px-5 py-4 text-right">
                    Initial stock
                  </th>
                  <th scope="col" className="px-5 py-4 text-right">
                    Available
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Last updated
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f4eded]">
                {loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center text-sm text-[#887c7f]"
                    >
                      Loading inventory records…
                    </td>
                  </tr>
                )}

                {!loading && !error && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="text-sm font-semibold">
                        {hasActiveFilters
                          ? "No matching products found"
                          : "Your inventory is empty"}
                      </p>
                      <p className="mt-2 text-xs text-[#96898d]">
                        {hasActiveFilters
                          ? "Try a different search term or adjust your stock filters."
                          : "No inventory records have been added to this workspace yet. Once products are added, they'll appear here."}
                      </p>
                    </td>
                  </tr>
                )}

                {items.map((item) => (
                  <tr key={item.sku} className="transition hover:bg-[#fdfbfa]">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-medium text-[#594d51]">
                      {item.sku}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#34272d]">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-[11px] text-[#a09295]">
                        Source: {item.sourceSheet}, row {item.sourceRow}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-[#756b6e]">
                      {formatQuantity(item.initialStock)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-[#34272d]">
                      {formatQuantity(item.availableStock)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge status={item.stockStatus} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-[#887c7f]">
                      {formatDate(item.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f1e9e8] px-5 py-4 sm:px-6">
            <p className="text-xs text-[#887c7f]" aria-live="polite">
              {hasNoResults
                ? "No results to display"
                : meta
                  ? `Showing ${startItem.toLocaleString("en-IN")}–${endItem.toLocaleString("en-IN")} of ${meta.totalItems.toLocaleString("en-IN")} items`
                  : "Waiting for inventory data"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!meta || meta.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-[#e9dfe1] px-3 py-2 text-xs font-medium text-[#594d51] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-xs text-[#756b6e]">
                {hasNoResults
                  ? "No pages available"
                  : meta
                    ? `${meta.page} / ${totalPages}`
                    : "—"}
              </span>

              <button
                type="button"
                disabled={!meta || meta.page >= meta.totalPages || loading}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-[#e9dfe1] px-3 py-2 text-xs font-medium text-[#594d51] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
