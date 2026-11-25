import { Menu, RefreshCw } from "lucide-react";
import type { RefObject } from "react";

import type { WorkspacePage } from "../../components/navigation/navigation.config";
import AccountMenu from "./AccountMenu";

interface WorkspaceHeaderProps {
  activePage: WorkspacePage;
  businessName: string;
  loading: boolean;
  onRefresh: () => void;
  mobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Shared header for authenticated workspace pages.
 *
 * Displays page context, the selected business, refresh controls,
 * and account actions. Mobile navigation state remains in MainLayout
 * because it is shared with MobileSidebar.
 */
export default function WorkspaceHeader({
  activePage,
  businessName,
  loading,
  onRefresh,
  mobileMenuOpen,
  onOpenMobileMenu,
  mobileMenuButtonRef,
}: WorkspaceHeaderProps) {
  const isInventoryPage = activePage === "inventory";

  return (
    <header className="relative z-30 flex min-h-24 flex-col gap-4 border-b border-[#eee5e4] bg-white/80 px-5 py-4 backdrop-blur sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-5">
      {/*
        Responsive page heading.

        Mobile places the heading below the controls.
        Desktop displays it on the left side of the header.
      */}
      <div className="order-2 min-w-0 lg:order-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:mt-1.5">
          {isInventoryPage ? "Inventory management" : "Inventory dashboard"}
        </h1>

        <p className="mt-1 text-xs font-medium text-[#a09295] lg:order-first">
          Workspace / {isInventoryPage ? "Inventory" : "Overview"}
        </p>
      </div>

      {/* Workspace controls */}
      <div className="order-1 flex min-w-0 items-center justify-between gap-2 lg:order-2 lg:justify-end lg:gap-3">
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={onOpenMobileMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#eee5e4] bg-white text-[#594d51] transition hover:bg-[#faf4f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a92f62] lg:hidden"
        >
          <Menu aria-hidden="true" size={20} strokeWidth={1.75} />
        </button>

        {/* Active business indicator */}
        <div
          className="flex min-w-0 max-w-64 items-center gap-2 rounded-full border border-[#eee5e4] bg-white px-3 py-2 text-xs text-[#7f7377]"
          title={businessName}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate">{businessName}</span>
        </div>

        {/* Refresh remains disabled while its request is in progress. */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e9dfe1] bg-white px-3 text-sm font-medium text-[#594d51] shadow-sm hover:border-[#d9a5b8] disabled:opacity-60 sm:px-4"
        >
          <RefreshCw
            aria-hidden="true"
            size={19}
            strokeWidth={1.75}
            className={loading ? "animate-spin" : ""}
          />

          <span className="sr-only sm:not-sr-only">
            {loading ? "Refreshing…" : "Refresh data"}
          </span>
        </button>

        <AccountMenu />
      </div>
    </header>
  );
}
