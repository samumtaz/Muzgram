const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3100';

const TOKEN_KEY = 'muzgram_admin_token';

let adminToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setAdminToken(token: string) {
  adminToken = token;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  adminToken = null;
  localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return adminToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(adminToken && { Authorization: `Bearer ${adminToken}` }),
    ...(init.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}/v1${path}`, { ...init, headers });

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
