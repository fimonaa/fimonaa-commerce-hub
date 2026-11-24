import { useCallback, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../features/auth/context/useAuth";
import type { WorkspacePage } from "../components/navigation/navigation.config";

import DesktopSidebar from "../components/navigation/DesktopSidebar";
import MobileSidebar from "../components/navigation/MobileSidebar";
import WorkspaceHeader from "./components/WorkspaceHeader";
import { getBusinessRoleLabel } from "../features/auth/utils/business-role.utils";

type MainLayoutProps = {
  children: ReactNode;
  activePage: WorkspacePage;
  onRefresh: () => void;
  loading: boolean;
};

/**
 * Composes the authenticated Commerce Hub workspace.
 * Navigation, header presentation, and account actions are
 * delegated to dedicated components. MainLayout coordinates
 * the shared mobile drawer state and selected workspace context.
 */
export default function MainLayout({
  children,
  activePage,
  onRefresh,
  loading,
}: MainLayoutProps) {
  /**
   * MainLayout only needs the selected workspace for its header
   * and mobile navigation. Account actions belong to AccountMenu.
   */
  const { selectedBusiness } = useAuth();

  /**
   * Mobile navigation is displayed as a temporary drawer.
   *
   * The desktop sidebar remains permanently visible at the
   * large-screen breakpoint.
   */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Provide a stable drawer dismissal callback so the mobile
   * component can manage its accessibility lifecycle independently.
   */
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const businessName = selectedBusiness?.name ?? "No business selected";

  const businessRole = selectedBusiness
    ? getBusinessRoleLabel(selectedBusiness.role)
    : "";

  return (
    <div className="min-h-screen bg-[#faf7f5] text-[#292326]">
      <MobileSidebar
        activePage={activePage}
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        triggerRef={mobileMenuButtonRef}
        businessName={businessName}
        businessRole={businessRole}
      />

      <DesktopSidebar activePage={activePage} />

      <main className="min-h-screen lg:pl-64">
        <WorkspaceHeader
          activePage={activePage}
          businessName={businessName}
          loading={loading}
          onRefresh={onRefresh}
          mobileMenuOpen={mobileMenuOpen}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          mobileMenuButtonRef={mobileMenuButtonRef}
        />

        {children}
      </main>
    </div>
  );
}
