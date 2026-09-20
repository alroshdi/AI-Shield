import type { AuditEntry, Corpus, ScanReport, ScanSummary, TargetInfo } from "../types";

// Set at build time (frontend/.env, VITE_API_BASE_URL=https://your-api-host) when the
// frontend is deployed separately from the API (e.g. frontend on Vercel, API on Docker/a
// VM) and there's no reverse proxy to make "/api" resolve to the same origin. Unset for
// local dev and the Docker Compose setup, where nginx/Vite already proxy "/api" for us.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const BASE = `${API_BASE_URL ?? ""}/api`;

// Set at build time (frontend/.env, VITE_API_KEY=...) to match the server's
// AI_SHIELD_API_KEY when the API has auth enabled. Unset in local dev, matching the
// API's own zero-config default.
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; auth_required: boolean }>("/health"),
  listScans: () => request<ScanSummary[]>("/scans"),
  getScan: (scanId: string) => request<ScanReport>(`/scans/${scanId}`),
  deleteScan: (scanId: string) => request<{ status: string; scan_id: string }>(`/scans/${scanId}`, { method: "DELETE" }),
  runScan: (body: { target: string; packs?: string[]; trials: number; authorized_by: string; redact?: boolean }) =>
    request<ScanReport>("/scans", { method: "POST", body: JSON.stringify(body) }),
  rescan: (scanId: string, body: { target: string; finding: string; trials?: number; redact?: boolean }) =>
    request<ScanReport>(`/scans/${scanId}/rescan`, { method: "POST", body: JSON.stringify(body) }),
  listTargets: () => request<TargetInfo[]>("/targets"),
  hardenTarget: (targetFile: string) =>
    request<{ status: string; detail?: string }>(`/targets/${targetFile}/harden`, { method: "POST" }),
  unhardenTarget: (targetFile: string) =>
    request<{ status: string; detail?: string }>(`/targets/${targetFile}/unharden`, { method: "POST" }),
  corpus: () => request<Corpus>("/corpus"),
  auditLog: () => request<AuditEntry[]>("/audit"),
};

export { ApiError };
