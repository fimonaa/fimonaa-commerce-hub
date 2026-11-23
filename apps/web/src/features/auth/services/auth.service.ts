import { apiGet, apiPost } from "../../../services/api/client";

import type {
  LoginRequest,
  LoginResponse,
  MyBusinessesResponse,
} from "../types/auth.types";

export function login(
  credentials: LoginRequest,
  signal?: AbortSignal,
): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", credentials, { signal });
}

export function getMyBusinesses(
  accessToken: string,
  signal?: AbortSignal,
): Promise<MyBusinessesResponse> {
  return apiGet<MyBusinessesResponse>("/auth/my-businesses", {
    accessToken,
    signal,
  });
}
