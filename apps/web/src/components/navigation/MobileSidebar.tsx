import { useEffect, useRef, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Download, LayoutDashboard, Layers3, X } from "lucide-react";

import { navigation, type WorkspacePage } from "./navigation.config";

interface MobileSidebarProps {
  activePage: WorkspacePage;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  businessName: string;
  businessRole: string;
}

/**
 * Maps the shared navigation configuration to Lucide icons.
 *
 * Both desktop and mobile navigation use the same icon set
 * and visual proportions.
 */
const navigationIcons = {
  dashboard: LayoutDashboard,
  inventory: Layers3,
  activity: Activity,
  imports: Download,
};

/**
 * Temporary navigation drawer for mobile and tablet screens.
 *
 * The parent controls visibility while this component manages
 * navigation, keyboard accessibility, and scroll locking.
 */
export default function MobileSidebar({
  activePage,
  isOpen,
  onClose,
  triggerRef,
  businessName,
  businessRole,
}: MobileSidebarProps) {
  const navigate = useNavigate();

  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Keep keyboard interaction inside the open drawer.
   *
   * Escape closes the drawer, Tab cycles through its controls,
   * and background scrolling is restored during cleanup.
   */
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      // Prevent focus from escaping when the user tabs past
      // the first or last interactive element.
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      // Return keyboard focus to the control that opened the drawer.
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  /**
   * Close the drawer before navigating to the selected page.
   */
  function handleNavigation(page: WorkspacePage) {
    onClose();
    navigate(page === "dashboard" ? "/" : "/inventory");
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Dismiss the drawer when clicking outside it. */}
      <div
        className="absolute inset-0 bg-[#292326]/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="mobile-navigation"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[min(85vw,320px)] flex-col bg-white shadow-2xl"
      >
        {/* Brand identity and drawer dismissal */}
        <div className="flex h-24 items-center justify-between border-b border-[#f1e9e8] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8e7ee] text-lg font-semibold text-[#a92f62]">
              F
            </div>

            <div>
              <p className="text-lg font-semibold tracking-tight">Fimonaa</p>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a92f62]">
                Commerce Hub
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#756b6e] hover:bg-[#faf4f6] focus-visible:outline-2 focus-visible:outline-[#a92f62]"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Workspace navigation */}
        <nav
          aria-label="Mobile navigation"
          className="flex-1 space-y-1 overflow-y-auto px-5 py-7"
        >
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a69a9c]">
            Workspace
          </p>

          {navigation.map((item) => {
            const isActive = item.page === activePage;
            const NavigationIcon = navigationIcons[item.icon];

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

        {/* Active workspace information */}
        <div className="border-t border-[#f1e9e8] p-5">
          <p className="truncate text-sm font-semibold text-[#292326]">
            {businessName}
          </p>

          <p className="mt-1 text-xs text-[#887c7f]">{businessRole}</p>
        </div>
      </aside>
    </div>
  );
}
