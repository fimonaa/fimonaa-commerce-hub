import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export type WorkspacePage = "dashboard" | "inventory";

type MainLayoutProps = {
  children: ReactNode;
  activePage: WorkspacePage;
  onRefresh: () => void;
  loading: boolean;
};

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, string> = {
    dashboard: "M3 3h7v7H3z M14 3h7v4h-7z M14 10h7v11h-7z M3 14h7v7H3z",
    inventory: "M3 7 12 2l9 5-9 5-9-5Z M3 12l9 5 9-5 M3 17l9 5 9-5",
    activity: "M3 12h4l3-8 4 16 3-8h4",
    imports: "M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4",
    refresh:
      "M20 7v5h-5 M4 17v-5h5 M5.6 9a7 7 0 0 1 11.7-2L20 12 M4 12l2.7 5a7 7 0 0 1 1.7-2",
  };

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
  );
}

const navigation = [
  { label: "Dashboard", icon: "dashboard", page: "dashboard" as const },
  { label: "Inventory", icon: "inventory", page: "inventory" as const },
  { label: "Stock Movements", icon: "activity", page: null },
  { label: "Imports", icon: "imports", page: null },
];

export default function MainLayout({
  children,
  activePage,
  onRefresh,
  loading,
}: MainLayoutProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#faf7f5] text-[#292326]">
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
            {navigation.map((item) => {
              const isActive = item.page === activePage;

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={!item.page}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    if (item.page) {
                      navigate(item.page === "dashboard" ? "/" : "/inventory");
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                    isActive
                      ? "bg-[#f9eaf0] font-semibold text-[#a92f62]"
                      : "text-[#756b6e] hover:bg-[#faf5f6] disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}

                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b6386d]" />
                  )}
                </button>
              );
            })}
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

      <main className="min-h-screen lg:pl-64">
        <header className="flex min-h-24 flex-wrap items-center justify-between gap-4 border-b border-[#eee5e4] bg-white/80 px-5 py-5 backdrop-blur sm:px-8 lg:px-10">
          <div>
            <p className="text-xs font-medium text-[#a09295]">
              Workspace /{" "}
              {activePage === "inventory" ? "Inventory" : "Overview"}
            </p>

            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
              {activePage === "inventory"
                ? "Inventory management"
                : "Inventory dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#eee5e4] bg-white px-3 py-2 text-xs text-[#7f7377] sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              India inventory
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e9dfe1] bg-white px-4 py-2.5 text-sm font-medium text-[#594d51] shadow-sm hover:border-[#d9a5b8] disabled:opacity-60"
            >
              <Icon name="refresh" />
              {loading ? "Refreshing…" : "Refresh data"}
            </button>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5dce6] text-sm font-semibold text-[#9d315e]"
              aria-label="Fimonaa workspace"
            >
              F
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
