import type { BrowserDetails, ConnectionReport, FingerprintData, WebRTCData } from "@/types/report"

export type ExposureLevel = "exact" | "approx" | "hidden"
export type VerdictTone = "good" | "medium" | "bad"

export interface ExposureItem {
  label: string
  value: string
  level: ExposureLevel
  hint: string
}

export interface CasualExposureSummary {
  verdict: string
  verdictDetail: string
  tone: VerdictTone
  visiblePercent: number
  location: { title: string; value: string; sub: string }
  device: { title: string; value: string; sub: string }
  network: { title: string; value: string; sub: string }
  canSee: { icon: string; text: string }[]
  cantSee: { icon: string; text: string }[]
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

export function buildCasualExposureSummary(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  webRTC: WebRTCData | null,
  webrtcStatus: WebRTCData["status"],
  exposedCount: number,
  totalItems: number,
): CasualExposureSummary {
  const browserName = report.browser || browser?.name || "Unknown browser"
  const osName = report.operating_system || browser?.os || "Unknown OS"
  const cityLine = [report.city, report.region].filter(Boolean).join(", ")
  const isProtected = report.vpn || report.proxy || report.tor

  const visiblePercent = totalItems > 0 ? Math.round((exposedCount / totalItems) * 100) : 50

  let tone: VerdictTone = "medium"
  let verdict = "Moderately visible"
  let verdictDetail = "Websites can learn quite a bit about you from a single visit."

  if (visiblePercent >= 70 || webrtcStatus === "Leak" || isDnsLeak(report.dns_leak)) {
    tone = "bad"
    verdict = "Highly visible"
    verdictDetail = "Lots of personal details are easy for sites to collect right now."
  } else if (visiblePercent <= 45 && webrtcStatus === "Safe" && isDnsSafe(report.dns_leak) && isProtected) {
    tone = "good"
    verdict = "Well protected"
    verdictDetail = "You're masking most signals — sites see less than usual."
  } else if (visiblePercent <= 55 && webrtcStatus === "Safe") {
    tone = "good"
    verdict = "Mostly okay"
    verdictDetail = "Basic info is visible, but critical leaks look blocked."
  }

  const canSee: { icon: string; text: string }[] = [
    { icon: "📍", text: `You're browsing from ${report.country || "an unknown country"}${cityLine ? ` (${cityLine})` : ""}` },
    { icon: "💻", text: `You use ${browserName} on ${osName}` },
    { icon: "🌐", text: `Your IP (${report.ip}) and ISP (${report.isp || "unknown"}) are visible` },
    { icon: "🗣️", text: `Your language is ${report.language || browser?.language || "detectable"}` },
  ]

  if (webrtcStatus === "Leak") {
    canSee.push({ icon: "⚠️", text: "WebRTC may expose your real IP even behind VPN" })
  }
  if (isDnsLeak(report.dns_leak)) {
    canSee.push({ icon: "⚠️", text: "DNS queries might reveal your real location" })
  }
  if (!isProtected) {
    canSee.push({ icon: "👁️", text: "No VPN — sites see your direct home connection" })
  }

  const cantSee: { icon: string; text: string }[] = []
  if (webrtcStatus === "Safe") {
    cantSee.push({ icon: "✓", text: "WebRTC isn't leaking extra IP addresses" })
  }
  if (isDnsSafe(report.dns_leak)) {
    cantSee.push({ icon: "✓", text: "DNS looks routed safely" })
  }
  if (isProtected) {
    cantSee.push({ icon: "✓", text: isProtected && report.vpn ? "VPN is hiding your real IP" : "Traffic is tunneled" })
  }
  if (cantSee.length === 0) {
    cantSee.push({ icon: "—", text: "No major protections detected yet" })
  }

  return {
    verdict,
    verdictDetail,
    tone,
    visiblePercent,
    location: {
      title: "Where you appear",
      value: report.country || "Unknown",
      sub: cityLine || "City not detected",
    },
    device: {
      title: "Your device",
      value: browserName,
      sub: osName,
    },
    network: {
      title: "Your connection",
      value: report.isp || "Unknown provider",
      sub: isProtected ? (report.vpn ? "VPN active" : report.tor ? "Tor active" : "Proxy") : "Direct — no VPN",
    },
    canSee,
    cantSee,
  }
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
    { label: "Public IP", value: report.ip || "—", level: "exact", hint: "Websites always see your exit IP address" },
    { label: "Country", value: report.country || "Unknown", level: isProtected ? "approx" : "exact", hint: isProtected ? "VPN may show exit country" : "Exact from IP geolocation" },
    { label: "City", value: [report.city, report.region].filter(Boolean).join(", ") || "Unknown", level: isProtected ? "approx" : "exact", hint: "Usually accurate to city level" },
    { label: "ISP / Network", value: report.isp || report.organization || "Unknown", level: "exact", hint: "Visible on every site visit" },
    { label: "Browser", value: `${browserName}${browser?.version && browser.version !== "—" ? ` ${browser.version}` : ""}`, level: "exact", hint: "Sent in User-Agent header" },
    { label: "Operating System", value: osName, level: "exact", hint: "Parsed from User-Agent" },
    { label: "Language", value: report.language || browser?.language || "—", level: "exact", hint: "Browser language header" },
    { label: "Timezone", value: report.timezone || "—", level: "exact", hint: "Inferred from IP or JavaScript" },
    {
      label: "WebRTC",
      value: webrtcStatus === "Safe" ? "No leak" : webrtcStatus === "Leak" ? "IP leaking" : webrtcStatus,
      level: webrtcStatus === "Safe" ? "hidden" : webrtcStatus === "Leak" ? "exact" : "approx",
      hint: webrtcStatus === "Safe" ? "No extra IP via STUN" : "Can reveal real IP behind VPN",
    },
    {
      label: "DNS",
      value: isDnsSafe(report.dns_leak) ? "Protected" : isDnsLeak(report.dns_leak) ? "Leaking" : "Unknown",
      level: isDnsSafe(report.dns_leak) ? "hidden" : isDnsLeak(report.dns_leak) ? "exact" : "approx",
      hint: isDnsLeak(report.dns_leak) ? "DNS may bypass VPN" : "DNS routing looks consistent",
    },
    {
      label: "Canvas ID",
      value: fingerprint?.canvas ? (fingerprint.canvas.length > 22 ? `${fingerprint.canvas.slice(0, 20)}…` : fingerprint.canvas) : "—",
      level: "approx",
      hint: "Browser fingerprint without cookies",
    },
    {
      label: "GPU / WebGL",
      value: fingerprint?.webglRenderer?.slice(0, 40) || "—",
      level: "exact",
      hint: "Hardware string readable by scripts",
    },
  ]
}

export const exposureLevelMeta: Record<ExposureLevel, { label: string; dot: string; text: string }> = {
  exact: { label: "Fully visible", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  approx: { label: "Approximate", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  hidden: { label: "Protected", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
}
