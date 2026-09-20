import type { Corpus, ScanReport, ScanSummary, TargetInfo } from "../types";

const BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  listScans: () => request<ScanSummary[]>("/scans"),
  getScan: (scanId: string) => request<ScanReport>(`/scans/${scanId}`),
  runScan: (body: { target: string; packs?: string[]; trials: number; authorized_by: string }) =>
    request<ScanReport>("/scans", { method: "POST", body: JSON.stringify(body) }),
  rescan: (scanId: string, body: { target: string; finding: string; trials?: number }) =>
    request<ScanReport>(`/scans/${scanId}/rescan`, { method: "POST", body: JSON.stringify(body) }),
  listTargets: () => request<TargetInfo[]>("/targets"),
  corpus: () => request<Corpus>("/corpus"),
};

export { ApiError };
