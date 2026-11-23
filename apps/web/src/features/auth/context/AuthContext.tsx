import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "../../../services/api/client";
import {
  getMyBusinesses,
  login as loginRequest,
} from "../services/auth.service";
import { AuthContext, type AuthState } from "./auth-context";

const initialState: AuthState = {
  accessToken: null,
  businesses: [],
  selectedBusiness: null,
  status: "unauthenticated",
  error: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== null) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    requestIdRef.current += 1;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    clearExpiryTimer();

    setState(initialState);
  }, [clearExpiryTimer]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      abortControllerRef.current?.abort();
      clearExpiryTimer();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({
        ...initialState,
        status: "authenticating",
      });

      let loginCompleted = false;

      try {
        const response = await loginRequest(
          { email, password },
          controller.signal,
        );

        if (requestId !== requestIdRef.current) {
          return;
        }
        loginCompleted = true;

        const expiresAt = Date.now() + Math.max(0, response.expiresIn * 1000);
        const businessesResponse = await getMyBusinesses(
          response.accessToken,
          controller.signal,
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (Date.now() >= expiresAt) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        const businesses = businessesResponse.data;

        const selectedBusiness = businesses.length === 1 ? businesses[0] : null;

        setState({
          accessToken: response.accessToken,
          businesses,
          selectedBusiness,
          status: selectedBusiness ? "authenticated" : "selecting",
          error: null,
        });

        const expiresInMs = Math.max(0, expiresAt - Date.now());

        expiryTimerRef.current = setTimeout(() => {
          if (requestId === requestIdRef.current) {
            logout();
          }
        }, expiresInMs);
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        let message = "Unable to sign in. Please try again.";

        if (error instanceof ApiError) {
          if (error.status === 401) {
            message = loginCompleted
              ? "Your session has expired. Please sign in again."
              : "Invalid email or password.";
          } else if (error.status >= 500) {
            message = "The server is unavailable. Please try again later.";
          }
        } else if (
          error instanceof Error &&
          error.message === "Your session has expired. Please sign in again."
        ) {
          message = error.message;
        }

        setState({
          ...initialState,
          error: message,
        });

        throw error;
      } finally {
        if (
          requestId === requestIdRef.current &&
          abortControllerRef.current === controller
        ) {
          abortControllerRef.current = null;
        }
      }
    },
    [clearExpiryTimer, logout],
  );

  const selectBusiness = useCallback((businessId: string) => {
    setState((current) => {
      if (!current.accessToken) {
        return current;
      }

      const selectedBusiness = current.businesses.find(
        (business) => business.id === businessId,
      );

      if (!selectedBusiness) {
        return current;
      }

      return {
        ...current,
        selectedBusiness,
        status: "authenticated",
        error: null,
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      clearExpiryTimer();
    };
  }, [clearExpiryTimer]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        selectBusiness,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
