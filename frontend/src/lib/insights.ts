import { analyzePrivacyExposure } from "@/lib/exposure-engine"
import { isDnsLeak, isDnsSafe, resolveWebRTCStatus } from "@/lib/format"
import type {
  BrowserDetails,
  ConnectionReport,
  FingerprintData,
  ServiceStatus,
  WebRTCData,
} from "@/types/report"

export function getPrivacyScore(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  fingerprint: FingerprintData | null,
  webRTC: WebRTCData | null,
  webrtcStatus: WebRTCData["status"],
  services: Record<string, ServiceStatus>,
) {
  return analyzePrivacyExposure({
    report,
    browser,
    fingerprint,
    webRTC,
    webrtcStatus,
    services,
  }).privacyScore
}

export function getVerdict(report: ConnectionReport, privacyScore: number): { title: string; detail: string } {
  if (report.summary) {
    return { title: report.status || "Analyzed", detail: report.summary }
  }
  if (privacyScore >= 80) return { title: "Well Protected", detail: "Your connection hides most identity signals." }
  if (privacyScore >= 60) return { title: "Moderately Protected", detail: "Some privacy gaps remain on this network." }
  if (privacyScore >= 40) return { title: "Partially Exposed", detail: "Websites can learn meaningful details about you." }
  return { title: "High Exposure", detail: "Core identity signals are visible to websites." }
}

export function getConnectionType(report: ConnectionReport): string {
  if (report.tor) return "Tor"
  if (report.vpn) return "VPN"
  if (report.proxy) return "Proxy"
  if (report.datacenter || report.hosting) return "Datacenter"
  if (report.residential) return "Residential"
  if (report.mobile) return "Mobile"
  return report.asn_type || "Direct"
}

export function getVpnLabel(report: ConnectionReport): { label: string; ok: boolean } {
  if (report.tor) return { label: "Tor active", ok: true }
  if (report.vpn) return { label: "VPN detected", ok: true }
  if (report.proxy) return { label: "Proxy detected", ok: true }
  return { label: "No VPN", ok: false }
}

export function getWebRtcLabel(status: WebRTCData["status"]): { label: string; ok: boolean } {
  if (status === "Safe") return { label: "No leak", ok: true }
  if (status === "Partial") return { label: "Partial", ok: false }
  if (status === "Leak") return { label: "Leaking", ok: false }
  if (status === "Unsupported") return { label: "Disabled", ok: true }
  return { label: "Unknown", ok: false }
}

export function getDnsLabel(leak?: string): { label: string; ok: boolean } {
  if (isDnsLeak(leak)) return { label: "Leaking", ok: false }
  if (isDnsSafe(leak)) return { label: "Protected", ok: true }
  return { label: leak || "Unknown", ok: false }
}

export function getServiceLabel(status?: ServiceStatus): string {
  if (status === "Accessible" || status === "Reachable" || status === "Network Accessible") return "Available"
  if (status === "Blocked") return "Blocked"
  if (status === "Restricted") return "Limited"
  return "Unknown"
}

export function getReputationLabel(score: number): { label: string; ok: boolean } {
  if (score <= 25) return { label: "Low risk", ok: true }
  if (score <= 50) return { label: "Moderate", ok: false }
  return { label: "High risk", ok: false }
}

export { resolveWebRTCStatus }
