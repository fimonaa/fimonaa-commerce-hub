import { API_BASE_URL } from './config'

type ApiRequestOptions = {
  signal?: AbortSignal
}

export async function apiGet<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, '')
  const response = await fetch(`${API_BASE_URL}/${normalizedPath}`, {
    method: 'GET',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `API request failed (${response.status} ${response.statusText})`,
    )
  }

  return (await response.json()) as T
}