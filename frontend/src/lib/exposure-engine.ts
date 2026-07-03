import { isDnsLeak, isDnsSafe, resolveWebRTCStatus } from "@/lib/format"
import type {
  AnalysisInput,
  ExposureDimension,
  ExposureSeverity,
  PrivacyAnalysis,
  PrivacyTone,
  ServiceCompatibility,
} from "@/types/exposure"
import type { ConnectionReport, ServiceStatus } from "@/types/report"

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function severityFromExposure(exposure: number): ExposureSeverity {
  if (exposure <= 10) return "hidden"
  if (exposure <= 30) return "low"
  if (exposure <= 55) return "moderate"
  if (exposure <= 75) return "high"
  return "critical"
}

function toneFromScores(privacy: number, exposure: number): PrivacyTone {
  if (privacy >= 85 && exposure <= 25) return "excellent"
  if (privacy >= 70 && exposure <= 40) return "good"
  if (privacy >= 50 && exposure <= 60) return "caution"
  if (privacy >= 35) return "warning"
  return "critical"
}

function isTunnelActive(report: ConnectionReport): boolean {
  return report.vpn || report.proxy || report.tor
}

function mapServiceStatus(status: ServiceStatus): ServiceCompatibility["status"] {
  if (status === "Accessible" || status === "Reachable" || status === "Network Accessible") return "compatible"
  if (status === "Restricted") return "limited"
  if (status === "Blocked") return "blocked"
  return "unknown"
}

function serviceExplanation(name: string, status: ServiceCompatibility["status"], tunneled: boolean): string {
  if (status === "compatible") {
    return tunneled
      ? `${name} appears reachable through your current tunnel.`
      : `${name} is reachable on your direct connection.`
  }
  if (status === "limited") {
    return `${name} may restrict or challenge access from this network type.`
  }
  if (status === "blocked") {
    return `${name} is likely blocked or unreachable from this connection.`
  }
  return `We could not reliably verify ${name} access from your browser.`
}

function analyzeISP(report: ConnectionReport): ExposureDimension {
  const tunneled = isTunnelActive(report)
  const exposure = tunneled ? (report.tor ? 15 : 25) : 90
  const protection = 100 - exposure

  return {
    id: "isp",
    title: "ISP Visibility",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: tunneled
      ? "Your real home ISP is hidden from websites."
      : "Websites can see your real internet provider.",
    explanation: tunneled
      ? `Sites see ${report.isp || "a tunnel provider"} as your network operator instead of your home ISP. Your residential broadband identity is not directly advertised.`
      : `Every site you visit can identify ${report.isp || "your ISP"} as the company routing your traffic. This often reveals you are on a home or office connection.`,
  }
}

function analyzeASN(report: ConnectionReport): ExposureDimension {
  const tunneled = isTunnelActive(report)
  const asnLabel = report.asn ? `AS${report.asn}` : "your network"
  const exposure = tunneled ? 30 : 85
  const protection = 100 - exposure

  return {
    id: "asn",
    title: "ASN Visibility",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: tunneled
      ? "Your network's autonomous system is partially masked."
      : "Your network ASN is publicly visible.",
    explanation: tunneled
      ? `Websites still see an ASN (${asnLabel}, ${report.asn_type || "network type"}), but it belongs to the tunnel exit rather than your home provider.`
      : `Your connection is tagged with ${asnLabel} (${report.asn_type || "network classification"}). Fraud systems use this to group and score traffic.`,
  }
}

function analyzeLocation(report: ConnectionReport): ExposureDimension {
  const tunneled = isTunnelActive(report)
  const cityLine = [report.city, report.region].filter(Boolean).join(", ")
  const exposure = tunneled ? 45 : 80
  const protection = 100 - exposure

  return {
    id: "location",
    title: "Approximate Location Exposure",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: tunneled
      ? "Your approximate location is still visible at city level."
      : "Your approximate city-level location is exposed.",
    explanation: tunneled
      ? `Even behind a VPN, sites can still infer you appear near ${cityLine || report.country || "an unknown area"} based on your exit IP. This is usually city-level, not your exact address.`
      : `Geolocation from your IP places you around ${cityLine || report.country || "an unknown area"}. Advertisers and trackers commonly use this for profiling.`,
  }
}

function analyzeFingerprint(
  report: ConnectionReport,
  browser: AnalysisInput["browser"],
  fingerprint: AnalysisInput["fingerprint"],
): ExposureDimension {
  const hasEntropy = fingerprint && fingerprint.canvas !== "Blocked" && fingerprint.canvas !== "Unsupported"
  const exposure = hasEntropy ? 75 : 35
  const protection = 100 - exposure
  const browserName = report.browser || browser?.name || "your browser"

  return {
    id: "fingerprint",
    title: "Browser Fingerprint Exposure",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: hasEntropy
      ? "Your browser fingerprint remains highly unique."
      : "Browser fingerprinting signals look limited.",
    explanation: hasEntropy
      ? `${browserName} on ${report.operating_system || browser?.os || "your OS"} produces distinctive canvas, WebGL, and audio signals. Sites can recognize you without cookies.`
      : "Few high-entropy fingerprint signals were collected, which reduces passive tracking across sessions.",
  }
}

function analyzeWebRTC(webrtcStatus: AnalysisInput["webrtcStatus"], tunneled: boolean): ExposureDimension {
  let exposure = 20
  if (webrtcStatus === "Partial") exposure = 55
  if (webrtcStatus === "Leak") exposure = 95
  if (webrtcStatus === "Unsupported") exposure = 10

  const protection = 100 - exposure

  return {
    id: "webrtc",
    title: "WebRTC Exposure",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline:
      webrtcStatus === "Leak"
        ? "WebRTC may expose your real IP behind the VPN."
        : webrtcStatus === "Partial"
          ? "WebRTC exposes local network hints."
          : "WebRTC does not appear to leak extra addresses.",
    explanation:
      webrtcStatus === "Leak"
        ? tunneled
          ? "STUN requests can bypass your VPN and reveal your true public or local IP to scripts in the page."
          : "WebRTC can reveal local and public IP addresses to any site that requests them."
        : webrtcStatus === "Partial"
          ? "Private LAN addresses or partial candidates were detected. Some trackers use these for correlation."
          : "No dangerous WebRTC leak path was detected during this scan.",
  }
}

function analyzeIPv6(report: ConnectionReport, webRTC: AnalysisInput["webRTC"]): ExposureDimension {
  const ipv6Active = report.ipv6
  const localV6 = (webRTC?.localIPv6.length ?? 0) > 0
  let exposure = ipv6Active ? 50 : 15
  if (localV6) exposure = 70
  const protection = 100 - exposure

  return {
    id: "ipv6",
    title: "IPv6 Exposure",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: ipv6Active
      ? "IPv6 is active and may provide an additional tracking surface."
      : "IPv6 exposure looks minimal.",
    explanation: ipv6Active
      ? localV6
        ? "IPv6 interfaces were detected alongside WebRTC candidates, which can help sites correlate sessions."
        : "Your connection supports IPv6. Some networks use it as a secondary identifier alongside IPv4."
      : "IPv6 was not detected as an active path, reducing one common correlation vector.",
  }
}

function analyzeDNS(report: ConnectionReport, tunneled: boolean): ExposureDimension {
  const leak = report.dns_leak
  let exposure = 25
  if (isDnsLeak(leak)) exposure = 95
  else if (!isDnsSafe(leak) && leak) exposure = 50
  else if (tunneled) exposure = 15

  const protection = 100 - exposure

  return {
    id: "dns",
    title: "DNS Leak Status",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: isDnsLeak(leak)
      ? "DNS queries may reveal your real location."
      : isDnsSafe(leak)
        ? "DNS resolution appears safely routed."
        : "DNS privacy could not be fully verified.",
    explanation: isDnsLeak(leak)
      ? tunneled
        ? "Some DNS requests appear to bypass your VPN tunnel, exposing which domains you visit to your real resolver."
        : "Your DNS resolver can log every domain you look up, linking activity to your household."
      : isDnsSafe(leak)
        ? tunneled
          ? "DNS lookups seem to stay inside your encrypted tunnel, hiding them from your ISP."
          : "No DNS leak was detected, but your resolver can still see the sites you visit."
        : "We could not confirm whether DNS is fully protected on this network.",
  }
}

function analyzeVPNQuality(report: ConnectionReport, webrtcStatus: AnalysisInput["webrtcStatus"]): ExposureDimension {
  const tunneled = isTunnelActive(report)
  if (!tunneled) {
    return {
      id: "vpn",
      title: "VPN Quality",
      protectionScore: 0,
      exposureScore: 100,
      severity: "critical",
      headline: "No VPN or privacy tunnel detected.",
      explanation: "Your traffic leaves your device directly through your ISP. There is no encryption layer hiding your origin network from websites.",
    }
  }

  let quality = 55
  if (report.vpn) quality += 15
  if (report.tor) quality += 10
  if (isDnsSafe(report.dns_leak)) quality += 15
  if (webrtcStatus === "Safe") quality += 10
  if (!report.datacenter && !report.hosting) quality += 10
  if (report.risk_score <= 30) quality += 5

  quality = clamp(quality)
  const exposure = 100 - quality

  return {
    id: "vpn",
    title: "VPN Quality",
    protectionScore: quality,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline:
      quality >= 80
        ? "Your VPN setup provides strong privacy coverage."
        : quality >= 55
          ? "Your VPN helps, but gaps remain."
          : "Your tunnel is active but quality is weak.",
    explanation:
      report.tor
        ? "Tor routing anonymizes origin traffic, though exit-node reputation and speed trade-offs apply."
        : report.datacenter || report.hosting
          ? "You are tunneled, but the exit IP looks like a datacenter. Some sites treat this as low-trust VPN traffic."
          : "Commercial VPN routing is active. Combined DNS and WebRTC results determine how complete the protection is.",
  }
}

function analyzeProxy(report: ConnectionReport): ExposureDimension {
  const active = report.proxy || report.vpn || report.tor
  const exposure = active ? 25 : 85
  const protection = 100 - exposure

  return {
    id: "proxy",
    title: "Proxy Detection",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: active
      ? "A proxy or VPN layer is detected on this connection."
      : "No proxy masking was detected.",
    explanation: active
      ? report.tor
        ? "Tor exit-node routing is detected. Your origin IP should not be visible to sites."
        : report.vpn
          ? "VPN/proxy routing is detected. Sites see the tunnel exit instead of your home line."
          : "Proxy routing is detected, partially separating your device from the visible exit IP."
      : "Traffic appears to come directly from your ISP-assigned address with no intermediary privacy layer.",
  }
}

function analyzeIPType(report: ConnectionReport): ExposureDimension {
  const residential = report.residential
  const datacenter = report.datacenter || report.hosting
  let exposure = 50
  if (residential && !isTunnelActive(report)) exposure = 70
  if (datacenter) exposure = 40
  if (isTunnelActive(report) && !datacenter) exposure = 35

  const protection = 100 - exposure

  return {
    id: "ip_type",
    title: "Hosting vs Residential IP",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline: residential
      ? "Your IP looks like a normal residential connection."
      : datacenter
        ? "Your IP is classified as hosting or datacenter traffic."
        : "Your IP type could not be clearly classified.",
    explanation: residential
      ? "Residential IPs appear as everyday home users, which helps trust scores but also ties activity to a household."
      : datacenter
        ? "Datacenter IPs are often flagged by streaming, banking, and fraud systems as VPN or bot traffic."
        : "Network classification affects how strictly websites filter your requests.",
  }
}

function analyzeAnonymous(report: ConnectionReport): ExposureDimension {
  let exposure = 85
  if (report.tor) exposure = 10
  else if (report.vpn && isDnsSafe(report.dns_leak)) exposure = 25
  else if (report.vpn || report.proxy) exposure = 35
  else if (report.anonymous) exposure = 40

  const protection = 100 - exposure

  return {
    id: "anonymous",
    title: "Anonymous Level",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline:
      report.tor
        ? "High anonymity routing is active."
        : isTunnelActive(report)
          ? "Moderate anonymity through a privacy tunnel."
          : "Low anonymity — your connection is easily traceable.",
    explanation: report.tor
      ? "Tor provides strong separation between your device and the exit seen by websites."
      : isTunnelActive(report)
        ? "A VPN or proxy hides your home IP, but browser fingerprints and cookies can still identify you."
        : "Without a tunnel, your IP, ISP, and location form a persistent identity across sites.",
  }
}

function analyzeReputation(report: ConnectionReport): ExposureDimension {
  const risk = report.risk_score ?? 0
  const exposure = clamp(risk)
  const protection = 100 - exposure

  return {
    id: "reputation",
    title: "IP Fraud Reputation",
    protectionScore: protection,
    exposureScore: exposure,
    severity: severityFromExposure(exposure),
    headline:
      risk >= 60
        ? "Your IP has a high fraud reputation score."
        : risk >= 35
          ? "Your IP has a moderate fraud reputation."
          : "Your IP has a low fraud reputation.",
    explanation:
      risk >= 60
        ? "Security systems may block logins, payments, or sign-ups from this address."
        : risk >= 35
          ? "Some services may apply extra verification when they see this IP."
          : "This address is generally trusted by anti-fraud systems.",
  }
}

function buildServiceCompat(
  services: Record<string, ServiceStatus>,
  aiNames: string[],
  streamingNames: string[],
  tunneled: boolean,
): { ai: ServiceCompatibility[]; streaming: ServiceCompatibility[] } {
  const toCompat = (name: string): ServiceCompatibility => {
    const status = mapServiceStatus(services[name] ?? "Unknown")
    return {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      label: name,
      status,
      explanation: serviceExplanation(name, status, tunneled),
    }
  }

  return {
    ai: aiNames.map(toCompat),
    streaming: streamingNames.map(toCompat),
  }
}

function buildProtectedAndExposed(
  report: ConnectionReport,
  dimensions: ExposureDimension[],
  tunneled: boolean,
): { protectedItems: string[]; exposedItems: string[] } {
  const protectedItems: string[] = []
  const exposedItems: string[] = []

  if (tunneled) {
    protectedItems.push("Your real home IP address is hidden behind the tunnel exit.")
    protectedItems.push("Your residential ISP name is not directly shown to websites.")
  } else {
    exposedItems.push(`Your public IP (${report.ip}) is visible to every site you visit.`)
    exposedItems.push(`Your ISP (${report.isp || "unknown"}) can be seen and logged by websites.`)
  }

  for (const dim of dimensions) {
    if (dim.exposureScore >= 60) {
      exposedItems.push(dim.headline)
    } else if (dim.protectionScore >= 70) {
      protectedItems.push(dim.headline)
    }
  }

  return {
    protectedItems: [...new Set(protectedItems)].slice(0, 8),
    exposedItems: [...new Set(exposedItems)].slice(0, 8),
  }
}

function buildNarrative(
  report: ConnectionReport,
  tunneled: boolean,
  privacyScore: number,
  exposureScore: number,
  dimensions: ExposureDimension[],
): string[] {
  const lines: string[] = []

  if (tunneled) {
    lines.push("Your real ISP is hidden behind a VPN or proxy tunnel.")
    lines.push("Websites see the tunnel exit IP instead of your home connection.")
  } else {
    lines.push("You are browsing on a direct connection with no VPN detected.")
    lines.push(`Websites can see your IP (${report.ip}) and ISP (${report.isp || "unknown"}).`)
  }

  const locationDim = dimensions.find(d => d.id === "location")
  if (locationDim && locationDim.exposureScore >= 45) {
    lines.push("Your approximate location is still visible at city or regional level.")
  }

  const fpDim = dimensions.find(d => d.id === "fingerprint")
  if (fpDim && fpDim.exposureScore >= 60) {
    lines.push("Your browser fingerprint remains highly unique and trackable.")
  }

  const webrtcDim = dimensions.find(d => d.id === "webrtc")
  if (webrtcDim && webrtcDim.exposureScore >= 70) {
    lines.push("WebRTC may leak identity signals even when other protections are active.")
  }

  const repDim = dimensions.find(d => d.id === "reputation")
  if (repDim && repDim.exposureScore >= 50) {
    lines.push("Your IP has an elevated fraud reputation that may trigger blocks.")
  } else if (repDim && repDim.exposureScore <= 25) {
    lines.push("Your IP has a low fraud reputation on anti-abuse systems.")
  }

  const aiBlocked = dimensions.length // placeholder - check services in caller

  if (privacyScore >= 75) {
    lines.push("Overall, your connection offers reasonable privacy for everyday browsing.")
  } else if (exposureScore >= 65) {
    lines.push("Overall, significant identity signals remain exposed to trackers and websites.")
  }

  void aiBlocked
  return lines.slice(0, 6)
}

function buildRecommendations(dimensions: ExposureDimension[], tunneled: boolean): string[] {
  const recs: string[] = []

  const webrtc = dimensions.find(d => d.id === "webrtc")
  if (webrtc && webrtc.exposureScore >= 70) {
    recs.push("Disable WebRTC leaks or use a browser extension that blocks STUN requests.")
  }

  const dns = dimensions.find(d => d.id === "dns")
  if (dns && dns.exposureScore >= 70) {
    recs.push("Route DNS through your VPN or switch to encrypted DNS (e.g. 1.1.1.1 inside the tunnel).")
  }

  if (!tunneled) {
    recs.push("Use a reputable VPN to hide your home IP and ISP from websites you visit.")
  }

  const vpn = dimensions.find(d => d.id === "vpn")
  if (tunneled && vpn && vpn.protectionScore < 60) {
    recs.push("Your tunnel is active but incomplete — verify DNS and WebRTC are fully protected.")
  }

  const rep = dimensions.find(d => d.id === "reputation")
  if (rep && rep.exposureScore >= 50) {
    recs.push("Avoid sensitive logins on this IP, or switch to a cleaner exit node.")
  }

  return recs.slice(0, 4)
}

function buildVerdict(privacyScore: number, exposureScore: number): { verdict: string; summary: string } {
  if (privacyScore >= 85 && exposureScore <= 25) {
    return {
      verdict: "Well Protected",
      summary: "Your privacy setup hides most identity signals. Remaining exposure is mostly approximate location and browser traits.",
    }
  }
  if (privacyScore >= 65) {
    return {
      verdict: "Moderately Protected",
      summary: "You have meaningful privacy layers, but trackers can still infer location, device type, or fingerprint signals.",
    }
  }
  if (privacyScore >= 45) {
    return {
      verdict: "Partially Exposed",
      summary: "Several identity signals remain visible. Websites can build a reliable profile of your connection.",
    }
  }
  return {
    verdict: "Highly Exposed",
    summary: "Your connection exposes core identity data. Sites can see your network, location hints, and device signals.",
  }
}

/** Core Exposure Analysis Engine */
export function analyzePrivacyExposure(input: AnalysisInput): PrivacyAnalysis {
  const { report, browser, fingerprint, webRTC, services } = input
  const webrtcStatus = input.webrtcStatus ?? resolveWebRTCStatus(webRTC?.status, report.webrtc_leak)
  const tunneled = isTunnelActive(report)

  const dimensions: ExposureDimension[] = [
    analyzeISP(report),
    analyzeASN(report),
    analyzeLocation(report),
    analyzeFingerprint(report, browser, fingerprint),
    analyzeWebRTC(webrtcStatus, tunneled),
    analyzeIPv6(report, webRTC),
    analyzeDNS(report, tunneled),
    analyzeVPNQuality(report, webrtcStatus),
    analyzeProxy(report),
    analyzeIPType(report),
    analyzeAnonymous(report),
    analyzeReputation(report),
  ]

  // Identity Exposure Score: weighted average of dimension exposure
  const weights: Record<string, number> = {
    isp: 0.12,
    asn: 0.06,
    location: 0.12,
    fingerprint: 0.14,
    webrtc: 0.14,
    ipv6: 0.05,
    dns: 0.14,
    vpn: 0.08,
    proxy: 0.05,
    ip_type: 0.05,
    anonymous: 0.08,
    reputation: 0.07,
  }

  let exposureSum = 0
  let weightTotal = 0
  let protectionSum = 0

  for (const dim of dimensions) {
    const w = weights[dim.id] ?? 0.08
    exposureSum += dim.exposureScore * w
    protectionSum += dim.protectionScore * w
    weightTotal += w
  }

  const identityExposureScore = clamp(exposureSum / weightTotal)
  const privacyScore = clamp(protectionSum / weightTotal)

  const { verdict, summary } = buildVerdict(privacyScore, identityExposureScore)
  const { protectedItems, exposedItems } = buildProtectedAndExposed(report, dimensions, tunneled)
  const narrative = buildNarrative(report, tunneled, privacyScore, identityExposureScore, dimensions)
  const recommendations = buildRecommendations(dimensions, tunneled)

  const { ai, streaming } = buildServiceCompat(
    services,
    ["ChatGPT"],
    ["Netflix", "Spotify"],
    tunneled,
  )

  // Add AI/streaming narrative lines
  const aiOk = ai.some(s => s.status === "compatible")
  const streamOk = streaming.some(s => s.status === "compatible")
  if (aiOk) narrative.push("Your connection is suitable for AI services.")
  if (streamOk) narrative.push("Streaming platforms appear reachable from this network.")

  return {
    privacyScore,
    identityExposureScore,
    tone: toneFromScores(privacyScore, identityExposureScore),
    verdict,
    summary,
    narrative,
    dimensions,
    protectedItems,
    exposedItems,
    recommendations,
    aiServices: ai,
    streamingServices: streaming,
  }
}

export function getIdentityExposureLevel(exposureScore: number): string {
  if (exposureScore <= 20) return "Minimal"
  if (exposureScore <= 40) return "Low"
  if (exposureScore <= 60) return "Moderate"
  if (exposureScore <= 80) return "High"
  return "Critical"
}

export function getToneStyles(tone: PrivacyTone): {
  ring: string
  text: string
  bg: string
  border: string
  glow: string
} {
  const map = {
    excellent: {
      ring: "#10b981",
      text: "text-emerald-400",
      bg: "bg-emerald-950/20",
      border: "border-emerald-500/20",
      glow: "rgba(16,185,129,0.15)",
    },
    good: {
      ring: "#22c55e",
      text: "text-green-400",
      bg: "bg-green-950/15",
      border: "border-green-500/20",
      glow: "rgba(34,197,94,0.12)",
    },
    caution: {
      ring: "#f59e0b",
      text: "text-amber-400",
      bg: "bg-amber-950/15",
      border: "border-amber-500/20",
      glow: "rgba(245,158,11,0.12)",
    },
    warning: {
      ring: "#f97316",
      text: "text-orange-400",
      bg: "bg-orange-950/15",
      border: "border-orange-500/20",
      glow: "rgba(249,115,22,0.12)",
    },
    critical: {
      ring: "#f43f5e",
      text: "text-rose-400",
      bg: "bg-rose-950/15",
      border: "border-rose-500/20",
      glow: "rgba(244,63,94,0.15)",
    },
  }
  return map[tone]
}

export function getSeverityStyles(severity: ExposureSeverity): { dot: string; label: string; text: string } {
  const map = {
    hidden: { dot: "bg-emerald-500", label: "Hidden", text: "text-emerald-400" },
    low: { dot: "bg-green-500", label: "Low", text: "text-green-400" },
    moderate: { dot: "bg-amber-500", label: "Moderate", text: "text-amber-400" },
    high: { dot: "bg-orange-500", label: "High", text: "text-orange-400" },
    critical: { dot: "bg-rose-500", label: "Critical", text: "text-rose-400" },
  }
  return map[severity]
}
