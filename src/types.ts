export interface ThreatResult {
  ipAddress: string;
  abuseScore: number;
  isPublic: boolean;
  ipVersion: number;
  isWhitelisted: boolean;
  usageType: string;
  isp: string;
  domain: string;
  hostnames: string[];
  countryCode: string;
  countryName: string;
  totalReports: number;
  numDistinctUsers: number;
  lastReportedAt: string;
}

export interface VTResult {
  attributes: {
    last_analysis_stats: {
      malicious: number;
      suspicious: number;
      undetected: number;
      harmless: number;
      timeout: number;
    };
    reputation: number;
    tags: string[];
    whois?: string;
  };
}

export interface PortScanResult {
  port: number;
  status: "open" | "closed";
  service?: string;
  banner?: string;
  vulnerabilities?: {
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }[];
}

export interface CorrelatedRisk {
  score: number;
  riskLevel: string;
  findings: string[];
  timestamp: string;
  target: string;
  fullResult?: any;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  type: "ip" | "url" | "domain" | "network";
  target: string;
  score: number;
}

// ── Threat Intel Workflow Types ──────────────────────────────
export interface ThreatScanResult {
  target: string;
  target_type: "ip" | "domain" | "url" | "hash";
  risk_level: "low" | "medium" | "high";
  vt_malicious: number;
  vt_suspicious: number;
  vt_reputation: number;
  otx_hits: number;
  cached: boolean;
  created_at: string;
  user_id?: string;
  id?: string;
}

export interface ScanAPIResponse {
  success: boolean;
  data?: ThreatScanResult;
  error?: string;
}

export interface ThreatFeedPulse {
  id: string;
  name: string;
  description: string;
  author: string;
  indicator_count: number;
  tags: string[];
  created: string;
  risk_color: string;
}

export interface AIThreatAnalysis {
  summary: string;
  risk_level: string;
  recommended_actions: string[];
}

export interface AIChatRequest {
  message: string;
  mode: "beginner" | "expert";
  context?: string;
}

export interface AIChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}
