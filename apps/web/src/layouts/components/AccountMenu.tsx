import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/context/useAuth";
import { getBusinessRoleLabel } from "../../features/auth/utils/business-role.utils";

/**
 * Displays account actions for the currently selected workspace.
 *
 * Authentication and workspace membership data remain managed
 * by AuthProvider. This component owns only its dropdown UI state.
 */
export default function AccountMenu() {
  const navigate = useNavigate();

  const { selectedBusiness, businesses, clearSelectedBusiness, logout } =
    useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const businessName = selectedBusiness?.name ?? "No business selected";

  const businessRole = selectedBusiness
    ? getBusinessRoleLabel(selectedBusiness.role)
    : "";

  const canSwitchBusiness = businesses.length > 1;

  /**
   * Dismiss the dropdown when clicking outside or pressing Escape.
   *
   * Event listeners are registered only while the menu is open
   * and are removed automatically when it closes.
   */
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  /**
   * Return to workspace selection without ending the session.
   *
   * AuthProvider retains the authenticated user and their
   * authorized memberships.
   */
  function handleSwitchWorkspace() {
    setIsOpen(false);
    clearSelectedBusiness();

    navigate("/select-business", { replace: true });
  }

  /**
   * End the current session and return to the login page.
   */
  function handleLogout() {
    setIsOpen(false);
    logout();

    navigate("/login", { replace: true });
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "account-menu" : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5dce6] text-sm font-semibold text-[#9d315e] transition hover:bg-[#efc8d8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a92f62]"
      >
        F
      </button>

      {isOpen && (
        <div
          id="account-menu"
          className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-[#eee5e4] bg-white p-2 shadow-[0_20px_60px_rgba(65,39,48,0.15)]"
        >
          {/* Active workspace information */}
          <div className="border-b border-[#f1e9e8] px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09295]">
              Current workspace
            </p>

            <p className="mt-2 truncate text-sm font-semibold text-[#292326]">
              {businessName}
            </p>

            <p className="mt-1 text-xs text-[#887c7f]">{businessRole}</p>
          </div>

          {/* Account actions */}
          <div className="space-y-1 pt-2">
            {canSwitchBusiness && (
              <button
                type="button"
                onClick={handleSwitchWorkspace}
                className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#594d51] transition hover:bg-[#faf4f6] focus-visible:outline-2 focus-visible:outline-[#a92f62]"
              >
                Switch workspace
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#a92f62] transition hover:bg-[#faf4f6] focus-visible:outline-2 focus-visible:outline-[#a92f62]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
