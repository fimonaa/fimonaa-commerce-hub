import { useNavigate } from "react-router-dom";

import { navigation, type WorkspacePage } from "./navigation.config";

import { Activity, Download, LayoutDashboard, Layers3 } from "lucide-react";

/**
 * Props for the desktop sidebar.
 *
 * activePage determines which navigation item
 * is highlighted as the current page.
 */
interface DesktopSidebarProps {
  activePage: WorkspacePage;
}

/**
 * Icons used by the desktop navigation.
 *
 * Centralizing the mapping keeps icon selection
 * consistent with the shared navigation configuration.
 */
const navigationIcons = {
  dashboard: LayoutDashboard,
  inventory: Layers3,
  activity: Activity,
  imports: Download,
};

/**
 * Persistent desktop navigation.
 *
 * Responsibilities:
 * 1. Display Fimonaa Commerce Hub branding.
 * 2. Render navigation items from the shared configuration.
 * 3. Highlight the currently active page.
 * 4. Navigate between available workspace pages.
 * 5. Display the workspace information footer.
 *
 * Visibility is controlled using Tailwind's lg breakpoint.
 * Mobile navigation is handled by a separate component.
 */
export default function DesktopSidebar({ activePage }: DesktopSidebarProps) {
  const navigate = useNavigate();

  /**
   * Navigate to the selected workspace page.
   *
   * Navigation routes are currently limited to
   * Dashboard and Inventory.
   */
  function handleNavigation(page: WorkspacePage) {
    navigate(page === "dashboard" ? "/" : "/inventory");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#eee5e4] bg-white lg:flex">
      {/* Brand identity */}
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

      {/* Workspace navigation */}
      <div className="px-5 pt-8">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a69a9c]">
          Workspace
        </p>

        <nav aria-label="Main navigation" className="mt-3 space-y-1">
          {navigation.map((item) => {
            const isActive = item.page === activePage;

            const NavigationIcon =
              navigationIcons[item.icon as keyof typeof navigationIcons];

            return (
              <button
                key={item.label}
                type="button"
                disabled={!item.page}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (item.page) {
                    handleNavigation(item.page);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  isActive
                    ? "bg-[#f9eaf0] font-semibold text-[#a92f62]"
                    : "text-[#756b6e] hover:bg-[#faf5f6] disabled:cursor-not-allowed disabled:opacity-50"
                }`}
              >
                <NavigationIcon
                  aria-hidden="true"
                  size={20}
                  strokeWidth={1.75}
                />

                {item.label}

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b6386d]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workspace information and application version */}
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
  );
}
