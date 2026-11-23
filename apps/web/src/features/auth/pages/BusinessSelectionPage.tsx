import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import type { BusinessRole } from "../types/auth.types";

const roleLabels: Record<BusinessRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  inventory_manager: "Inventory Manager",
  operator: "Operator",
  viewer: "Viewer",
};

export default function BusinessSelectionPage() {
  const navigate = useNavigate();

  const { status, businesses, selectedBusiness, selectBusiness, logout } =
    useAuth();

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "authenticating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf7f5]">
        <p role="status" className="text-sm text-[#887c7f]">
          Preparing your workspace...
        </p>
      </div>
    );
  }

  if (status === "authenticated" && selectedBusiness) {
    return <Navigate to="/" replace />;
  }

  function handleSelect(businessId: string) {
    selectBusiness(businessId);
    navigate("/", { replace: true });
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#faf7f5] px-5 py-12 text-[#292326]">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8e7ee] text-2xl font-semibold text-[#a92f62]">
            F
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Select your workspace
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#887c7f]">
            Choose the business you want to manage.
          </p>
        </header>

        <div className="rounded-3xl border border-[#eee5e4] bg-white p-6 shadow-[0_20px_60px_rgba(65,39,48,0.06)] sm:p-8">
          {businesses.length === 0 ? (
            <div className="py-8 text-center">
              <h2 className="text-lg font-semibold">No active workspaces</h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#887c7f]">
                Your account does not currently have access to an active
                business workspace. Please contact your administrator to request
                access.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  type="button"
                  onClick={() => handleSelect(business.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#eee5e4] p-5 text-left transition hover:border-[#d9a5b8] hover:bg-[#fdf8fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a92f62]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8e7ee] text-lg font-semibold text-[#a92f62]">
                      {business.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {business.name}
                      </p>

                      <p className="mt-1 text-xs text-[#887c7f]">
                        {roleLabels[business.role]}
                      </p>
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg text-[#a92f62]"
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#887c7f] hover:text-[#a92f62] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a92f62]"
          >
            Sign out
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-[#a09295]">
          Fimonaa Commerce Hub
        </p>
      </div>
    </div>
  );
}
