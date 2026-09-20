export type SeverityBand = "Critical" | "High" | "Medium" | "Low";

export interface Manifest {
  scan_id: string;
  target_name: string;
  corpus_version: string;
  packs: string[];
  trials_per_attack: number;
  started_at: string;
  config_hash: string;
  authorized_by: string;
}

export interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Finding {
  attack_id: string;
  name: string;
  pack: string;
  vuln_class: string;
  owasp: string;
  mitre_atlas: string;
  attack_success_rate: number;
  trials_run: number;
  trials_vulnerable: number;
  severity_score: number;
  severity_band: SeverityBand;
  confidence_avg: number;
  needs_review: boolean;
  remediation: string;
  example_transcript: TranscriptTurn[];
  status: "new" | "fixed" | "still_vulnerable" | "needs_review" | "not_vulnerable";
}

export interface ScanReport {
  manifest: Manifest;
  security_score: number;
  attacks_run: number;
  findings: Finding[];
}

export interface ScanSummary {
  scan_id: string;
  target_name: string;
  started_at: string;
  packs: string[];
  trials_per_attack: number;
  authorized_by: string;
  security_score: number;
  attacks_run: number;
  findings_count: number;
  vulnerable_count: number;
  severity_counts: Record<SeverityBand, number>;
}

export interface TargetInfo {
  file: string;
  name: string;
  base_url: string | null;
  adapter: string;
  authorization: {
    confirmed?: boolean;
    asserted_by?: string;
    scope?: string;
  };
  can_apply_fix: boolean;
  supports_indirect_injection: boolean;
}

export interface CorpusAttack {
  id: string;
  name: string;
  vuln_class: string;
  owasp: string;
  mitre_atlas: string;
  severity_prior: string;
  turn_count: number;
  uses_injected_document: boolean;
}

export type Corpus = Record<string, CorpusAttack[]>;

export interface AuditEntry {
  timestamp: string;
  event: "scan" | "rescan";
  scan_id: string;
  target_name: string;
  packs: string[];
  authorized_by: string;
  attacks_run?: number;
  attack_id?: string;
  status?: string;
}
