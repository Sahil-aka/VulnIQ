const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
let accessToken: string | null = null;

export type Target = { id: number; name: string; type: 'host' | 'image'; value: string; created_at: string };
export type Scan = { id: number; target_id: number; tool: 'trivy' | 'nmap'; status: string; error: string | null; created_at: string; started_at: string | null; finished_at: string | null };
export type Finding = { id: number; scan_id: number; tool: 'trivy' | 'nmap'; asset: string; title: string; cve_id: string | null; severity: string; fixed_version: string | null; description: string | null; created_at: string };
export type Summary = { total_findings: number; by_severity: Record<string, number>; by_tool: Record<string, number>; last_scans: Scan[] };

export function setToken(token: string | null) { accessToken = token; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = typeof payload?.detail === 'string' ? payload.detail : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) => request<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  targets: () => request<Target[]>('/targets'),
  addTarget: (body: { name: string; type: 'host' | 'image'; value: string }) => request<Target>('/targets', { method: 'POST', body: JSON.stringify(body) }),
  deleteTarget: (id: number) => request<void>(`/targets/${id}`, { method: 'DELETE' }),
  scans: () => request<Scan[]>('/scans'),
  startScan: (target_id: number, tool: 'trivy' | 'nmap') => request<Scan>('/scans', { method: 'POST', body: JSON.stringify({ target_id, tool }) }),
  findings: (params: URLSearchParams) => request<Finding[]>(`/findings?${params}`),
  summary: () => request<Summary>('/dashboard/summary'),
};
