import { API_BASE_URL } from "./config";

export type ApiRequestOptions = {
  signal?: AbortSignal;
  accessToken?: string;
  businessId?: string;
};

type ApiWriteOptions = ApiRequestOptions & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly details?: unknown;

  constructor(status: number, statusText: string, details?: unknown) {
    super(`API request failed (${status} ${statusText})`);

    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  options: ApiWriteOptions = {},
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");

  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  if (options.businessId) {
    headers.set("X-Business-Id", options.businessId);
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}/${normalizedPath}`, {
    method,
    signal: options.signal,
    headers,
    cache: "no-store",
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  if (!response.ok) {
    let details: unknown;

    try {
      details = await response.json();
    } catch {
      details = undefined;
    }

    throw new ApiError(response.status, response.statusText, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>("GET", path, options);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>("POST", path, {
    ...options,
    body,
  });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>("PATCH", path, {
    ...options,
    body,
  });
}
