const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let adminToken: string | null = null;

export function setAdminToken(token: string) {
  adminToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(adminToken && { Authorization: `Bearer ${adminToken}` }),
    ...(init.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }

  if (response.status === 204) return undefined as unknown as T;
  const envelope = await response.json();
  return (envelope.data ?? envelope) as T;
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
