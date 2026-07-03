import type { BrowserDetails, ConnectionReport, FingerprintData, WebRTCData } from "@/types/report"

export type ExposureLevel = "exact" | "approx" | "hidden"

export interface ExposureItem {
  label: string
  value: string
  level: ExposureLevel
  hint: string
}

/** Unicode flag — works offline on Windows without CDN */
export function countryCodeToFlag(code?: string): string {
  if (!code || code.length !== 2) return "🌐"
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return "🌐"
  return [...upper]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("")
}

export function isDnsSafe(leak?: string): boolean {
  return leak === "Safe" || leak === "No Leak"
}

export function isDnsLeak(leak?: string): boolean {
  return leak === "Leak"
}

export function resolveWebRTCStatus(
  client?: WebRTCData["status"],
  serverLeak?: string,
): WebRTCData["status"] {
  if (client === "Leak" || client === "Partial" || client === "Safe") return client
  if (serverLeak === "Leak") return "Leak"
  if (serverLeak === "Partial") return "Partial"
  if (serverLeak === "Safe") return "Safe"
  if (client === "Unsupported") return "Unsupported"
  return client ?? "Scanning"
}

export function buildExposureItems(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  fingerprint: FingerprintData | null,
  webRTC: WebRTCData | null,
): ExposureItem[] {
  const isProtected = report.vpn || report.proxy || report.tor
  const webrtcStatus = webRTC?.status ?? "Scanning"
  const browserName = report.browser || browser?.name || "Unknown"
  const osName = report.operating_system || browser?.os || "Unknown"

  return [
    {
      label: "Public IP",
      value: report.ip || "—",
      level: "exact",
      hint: "Websites always see your exit IP address",
    },
    {
      label: "Country",
      value: report.country || "Unknown",
      level: isProtected ? "approx" : "exact",
      hint: isProtected ? "VPN may show exit country, not your real one" : "Exact from IP geolocation",
    },
    {
      label: "City",
      value: [report.city, report.region].filter(Boolean).join(", ") || "Unknown",
      level: isProtected ? "approx" : "exact",
      hint: "Derived from IP — usually accurate to city level",
    },
    {
      label: "ISP / Network",
      value: report.isp || report.organization || "Unknown",
      level: "exact",
      hint: "Your provider name is visible to every site you visit",
    },
    {
      label: "Browser",
      value: `${browserName}${browser?.version && browser.version !== "—" ? ` ${browser.version}` : ""}`,
      level: "exact",
      hint: "Sent in User-Agent on every HTTP request",
    },
    {
      label: "Operating System",
      value: osName,
      level: "exact",
      hint: "Parsed from User-Agent or Client Hints",
    },
    {
      label: "Language",
      value: report.language || browser?.language || "—",
      level: "exact",
      hint: "Browser language header",
    },
    {
      label: "Timezone",
      value: report.timezone || "—",
      level: "exact",
      hint: "Can be inferred from IP or JavaScript",
    },
    {
      label: "WebRTC",
      value: webrtcStatus === "Safe" ? "No leak" : webrtcStatus === "Leak" ? "IP leaking" : webrtcStatus,
      level: webrtcStatus === "Safe" ? "hidden" : webrtcStatus === "Leak" ? "exact" : "approx",
      hint: webrtcStatus === "Safe"
        ? "No extra public IP exposed via STUN"
        : "WebRTC can reveal your real IP behind VPN",
    },
    {
      label: "DNS",
      value: isDnsSafe(report.dns_leak) ? "Protected" : isDnsLeak(report.dns_leak) ? "Leaking" : "Unknown",
      level: isDnsSafe(report.dns_leak) ? "hidden" : isDnsLeak(report.dns_leak) ? "exact" : "approx",
      hint: isDnsLeak(report.dns_leak)
        ? "DNS queries may bypass your VPN"
        : "DNS routing appears consistent with your connection",
    },
    {
      label: "Canvas ID",
      value: fingerprint?.canvas
        ? (fingerprint.canvas.length > 22 ? `${fingerprint.canvas.slice(0, 20)}…` : fingerprint.canvas)
        : "—",
      level: "approx",
      hint: "Sites can fingerprint your browser without cookies",
    },
    {
      label: "GPU / WebGL",
      value: fingerprint?.webglRenderer?.slice(0, 40) || "—",
      level: "exact",
      hint: "Hardware renderer string is readable by scripts",
    },
  ]
}

export const exposureLevelMeta: Record<ExposureLevel, { label: string; dot: string; text: string }> = {
  exact: { label: "Fully visible", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  approx: { label: "Approximate", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  hidden: { label: "Protected", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
}
