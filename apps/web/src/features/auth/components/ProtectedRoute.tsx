import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  const { status, accessToken, selectedBusiness } = useAuth();

  if (status === "authenticating") {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-[#faf7f5]"
      >
        <p className="text-sm text-[#887c7f]">Preparing your workspace...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (status === "selecting" || !selectedBusiness) {
    return <Navigate to="/select-business" replace />;
  }

  return <>{children}</>;
}
