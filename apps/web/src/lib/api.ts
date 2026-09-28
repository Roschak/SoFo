import type { ApiError } from './types';
import { resolveApiBase } from './server-config';


export class ApiRequestError extends Error {
  readonly code: string;
  readonly details: readonly string[];

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.details = error.details ?? [];
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  workspaceId?: string;
  body?: unknown;
}

export async function api<T>(path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.workspaceId) headers['x-workspace-id'] = options.workspaceId;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  // Resolved per call so a changed server URL applies immediately (no reload).
  const response = await fetch(`${resolveApiBase()}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      payload ?? { code: 'INTERNAL_ERROR', message: 'Unexpected response from server' },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
