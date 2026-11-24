import { createContext } from "react";

import type { AccessibleBusiness } from "../types/auth.types";

export type AuthStatus =
  | "unauthenticated"
  | "authenticating"
  | "selecting"
  | "authenticated";

export interface AuthState {
  accessToken: string | null;
  businesses: AccessibleBusiness[];
  selectedBusiness: AccessibleBusiness | null;
  status: AuthStatus;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  selectBusiness: (businessId: string) => void;
  clearSelectedBusiness: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
