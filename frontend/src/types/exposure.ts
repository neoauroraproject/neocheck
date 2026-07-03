export type ExposureSeverity = "hidden" | "low" | "moderate" | "high" | "critical"

export type PrivacyTone = "excellent" | "good" | "caution" | "warning" | "critical"

export interface ExposureDimension {
  id: string
  title: string
  /** 0–100: how well this area is protected (higher = better privacy) */
  protectionScore: number
  /** 0–100: how exposed you are in this area (higher = worse) */
  exposureScore: number
  severity: ExposureSeverity
  headline: string
  explanation: string
}

export interface ServiceCompatibility {
  id: string
  label: string
  status: "compatible" | "limited" | "blocked" | "unknown"
  explanation: string
}

export interface PrivacyAnalysis {
  privacyScore: number
  identityExposureScore: number
  tone: PrivacyTone
  verdict: string
  summary: string
  narrative: string[]
  dimensions: ExposureDimension[]
  protectedItems: string[]
  exposedItems: string[]
  recommendations: string[]
  aiServices: ServiceCompatibility[]
  streamingServices: ServiceCompatibility[]
}

export interface AnalysisInput {
  report: import("@/types/report").ConnectionReport
  browser: import("@/types/report").BrowserDetails | null
  fingerprint: import("@/types/report").FingerprintData | null
  webRTC: import("@/types/report").WebRTCData | null
  webrtcStatus: import("@/types/report").WebRTCData["status"]
  services: Record<string, import("@/types/report").ServiceStatus>
}
