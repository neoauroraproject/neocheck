import { isDnsLeak } from "@/lib/format"
import type { TranslationKey } from "@/lib/i18n/translations"
import type {
  BrowserDetails,
  ConnectionReport,
  EnvironmentSignals,
  FingerprintData,
  WebRTCData,
} from "@/types/report"

export type LeakSeverity = "ok" | "warning" | "critical"

export interface LeakFinding {
  id: string
  messageKey: TranslationKey
  severity: LeakSeverity
  detail?: string
}

export interface ConsistencyMismatch {
  messageKey: TranslationKey
}

export interface SignalIssue {
  id: string
  messageKey: TranslationKey
  hintKey: TranslationKey
  severity: "warning" | "critical"
  left: { labelKey: TranslationKey; value: string }
  right: { labelKey: TranslationKey; value: string }
}

export interface VisibilityItem {
  labelKey: TranslationKey
  hintKey: TranslationKey
  value: string
}

export interface VisibilityAnalysis {
  consistencyScore: number
  consistencySummaryKey: TranslationKey
  signalIssues: SignalIssue[]
  leaks: LeakFinding[]
  mismatches: ConsistencyMismatch[]
  networkIdentity: { labelKey: TranslationKey; value: string }[]
  browserIdentity: { labelKey: TranslationKey; value: string }[]
  visibility: VisibilityItem[]
}

/** Map country code to common timezone prefixes for rough consistency check */
function countryTimezoneHints(code?: string): string[] {
  const map: Record<string, string[]> = {
    US: ["America/", "US/"],
    GB: ["Europe/London", "GB"],
    DE: ["Europe/Berlin", "Europe/"],
    FR: ["Europe/Paris"],
    IR: ["Asia/Tehran", "Iran"],
    AE: ["Asia/Dubai"],
    TR: ["Europe/Istanbul", "Asia/Istanbul"],
    IN: ["Asia/Kolkata", "Asia/Calcutta"],
    JP: ["Asia/Tokyo"],
    AU: ["Australia/"],
    CA: ["America/Toronto", "America/Vancouver", "America/"],
  }
  return code ? map[code.toUpperCase()] || [] : []
}

function languageMatchesCountry(lang: string, code?: string): boolean {
  if (!code) return true
  const l = lang.toLowerCase()
  const c = code.toUpperCase()
  const hints: Record<string, string[]> = {
    US: ["en-us", "en"],
    GB: ["en-gb", "en"],
    IR: ["fa", "fa-ir", "per"],
    DE: ["de"],
    FR: ["fr"],
    TR: ["tr"],
    JP: ["ja"],
  }
  const allowed = hints[c]
  if (!allowed) return true
  return allowed.some(h => l.startsWith(h) || l === h)
}

export function analyzeLeaks(
  report: ConnectionReport,
  webRTC: WebRTCData | null,
  environment: EnvironmentSignals,
): LeakFinding[] {
  const findings: LeakFinding[] = []
  const publicIp = report.ip
  const tunneled = report.vpn || report.proxy || report.tor

  if (!webRTC || webRTC.status === "Unsupported") {
    findings.push({ id: "webrtc-na", messageKey: "leakNone", severity: "ok" })
  } else {
    const webrtcFindings: LeakFinding[] = []
    const extraPublic = webRTC.publicIPs.filter(ip => ip !== publicIp)
    const hasLocal = webRTC.localIPv4.length > 0
    const hasPublicV6 = webRTC.localIPv6.some(ip => !ip.startsWith("fe80"))

    if (extraPublic.length > 0) {
      webrtcFindings.push({
        id: "public-mismatch",
        messageKey: "leakPublicMismatch",
        severity: "critical",
        detail: extraPublic.join(", "),
      })
    }

    if (webRTC.publicIPs.length > 1) {
      webrtcFindings.push({
        id: "multi-public",
        messageKey: "leakMultiplePublic",
        severity: "critical",
        detail: webRTC.publicIPs.join(", "),
      })
    }

    if (hasLocal) {
      webrtcFindings.push({
        id: "local-lan",
        messageKey: "leakLocalLan",
        severity: "warning",
        detail: webRTC.localIPv4.join(", "),
      })
    }

    if (hasPublicV6 || (report.ipv6 && webRTC.localIPv6.length > 0)) {
      webrtcFindings.push({
        id: "ipv6-exposed",
        messageKey: "leakIpv6",
        severity: "warning",
        detail: webRTC.localIPv6.join(", ") || "IPv6 active",
      })
    }

    if (tunneled && extraPublic.length > 0) {
      webrtcFindings.push({
        id: "vpn-inconsistent",
        messageKey: "leakVpnInconsistent",
        severity: "critical",
      })
    }

    if (webrtcFindings.length === 0) {
      webrtcFindings.push({ id: "webrtc-clean", messageKey: "leakNone", severity: "ok" })
    }

    findings.push(...webrtcFindings)
  }

  if (isDnsLeak(report.dns_leak)) {
    findings.push({ id: "dns-leak", messageKey: "leakDns", severity: "critical" })
  }

  if (findings.length === 0) {
    findings.push({ id: "none", messageKey: "leakNone", severity: "ok" })
  }

  return findings
}

export function analyzeConsistency(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  webRTC: WebRTCData | null,
  environment: EnvironmentSignals,
): { score: number; summaryKey: TranslationKey; mismatches: ConsistencyMismatch[] } {
  const mismatches: ConsistencyMismatch[] = []
  let points = 100

  const tz = environment.timezone
  const lang = environment.locale || browser?.language || report.language
  const tzHints = countryTimezoneHints(report.country_code)
  const tzOk = tzHints.length === 0 || tzHints.some(h => tz.includes(h)) || report.timezone === tz

  if (!tzOk && report.country_code) {
    mismatches.push({ messageKey: "mismatchIpTimezone" })
    points -= 25
  }

  if (!languageMatchesCountry(lang, report.country_code)) {
    mismatches.push({ messageKey: "mismatchIpLanguage" })
    points -= 20
  }

  if (webRTC?.publicIPs.some(ip => ip !== report.ip)) {
    mismatches.push({ messageKey: "mismatchWebrtcIp" })
    points -= 30
  }

  if (report.ipv6 && webRTC && webRTC.localIPv6.length > 0) {
    mismatches.push({ messageKey: "mismatchIpv6Tunnel" })
    points -= 15
  }

  if (isDnsLeak(report.dns_leak)) {
    mismatches.push({ messageKey: "mismatchDns" })
    points -= 25
  }

  const score = Math.max(0, Math.min(100, points))
  let summaryKey: TranslationKey = "consistencyHigh"
  if (score < 50) summaryKey = "consistencyLow"
  else if (score < 75) summaryKey = "consistencyMedium"

  return { score, summaryKey, mismatches }
}

export function buildSignalIssues(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  webRTC: WebRTCData | null,
  environment: EnvironmentSignals,
): SignalIssue[] {
  const issues: SignalIssue[] = []
  const lang = environment.locale || browser?.language || report.language || "—"
  const acceptLang = environment.languages.length > 0 ? environment.languages.join(", ") : lang
  const ipRegion = report.country || report.country_code || "—"

  const tz = environment.timezone
  const tzHints = countryTimezoneHints(report.country_code)
  const tzOk = tzHints.length === 0 || tzHints.some(h => tz.includes(h)) || report.timezone === tz

  if (!tzOk && report.country_code) {
    issues.push({
      id: "ip-timezone",
      messageKey: "mismatchIpTimezone",
      hintKey: "hintMismatchIpTimezone",
      severity: "warning",
      left: { labelKey: "signalIpRegion", value: ipRegion },
      right: { labelKey: "signalTimezone", value: tz },
    })
  }

  if (!languageMatchesCountry(lang, report.country_code)) {
    issues.push({
      id: "ip-language",
      messageKey: "mismatchIpLanguage",
      hintKey: "hintMismatchIpLanguage",
      severity: "warning",
      left: { labelKey: "signalIpRegion", value: ipRegion },
      right: { labelKey: "signalLanguage", value: acceptLang },
    })
  }

  const webrtcExtra = webRTC?.publicIPs.filter(ip => ip !== report.ip) ?? []
  if (webrtcExtra.length > 0) {
    issues.push({
      id: "webrtc-ip",
      messageKey: "mismatchWebrtcIp",
      hintKey: "hintMismatchWebrtcIp",
      severity: "critical",
      left: { labelKey: "signalVisibleIp", value: report.ip },
      right: { labelKey: "signalWebrtcIp", value: webrtcExtra.join(", ") },
    })
  }

  if (report.ipv6 && webRTC && webRTC.localIPv6.some(ip => !ip.startsWith("fe80"))) {
    issues.push({
      id: "ipv6-tunnel",
      messageKey: "mismatchIpv6Tunnel",
      hintKey: "hintMismatchIpv6Tunnel",
      severity: "warning",
      left: { labelKey: "signalVisibleIp", value: report.ip },
      right: { labelKey: "signalIpv6", value: webRTC.localIPv6.filter(ip => !ip.startsWith("fe80")).join(", ") || "Active" },
    })
  }

  if (isDnsLeak(report.dns_leak)) {
    issues.push({
      id: "dns-resolver",
      messageKey: "mismatchDns",
      hintKey: "hintMismatchDns",
      severity: "critical",
      left: { labelKey: "signalIpRegion", value: ipRegion },
      right: { labelKey: "signalDns", value: report.dns_leak || "Leak" },
    })
  }

  return issues
}

export function buildWebsiteVisibility(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  fingerprint: FingerprintData | null,
  environment: EnvironmentSignals,
): VisibilityItem[] {
  const cityLine = [report.city, report.region].filter(Boolean).join(", ") || "—"

  return [
    { labelKey: "visPublicIp", hintKey: "visPublicIpHint", value: report.ip },
    { labelKey: "visCountry", hintKey: "visCountryHint", value: report.country || "—" },
    { labelKey: "visLocation", hintKey: "visLocationHint", value: cityLine },
    { labelKey: "visBrowser", hintKey: "visBrowserHint", value: report.browser || browser?.name || "—" },
    { labelKey: "visOs", hintKey: "visOsHint", value: report.operating_system || browser?.os || "—" },
    { labelKey: "visLanguage", hintKey: "visLanguageHint", value: environment.locale || report.language || "—" },
    { labelKey: "visTimezone", hintKey: "visTimezoneHint", value: environment.timezone },
    { labelKey: "visCanvas", hintKey: "visCanvasHint", value: fingerprint?.canvas || "—" },
    { labelKey: "visWebgl", hintKey: "visWebglHint", value: fingerprint?.webglRenderer?.slice(0, 48) || "—" },
    { labelKey: "visAudio", hintKey: "visAudioHint", value: fingerprint?.audio || "—" },
    { labelKey: "visCookies", hintKey: "visCookiesHint", value: environment.cookiesEnabled ? "Enabled" : "Disabled" },
    { labelKey: "visLocalStorage", hintKey: "visLocalStorageHint", value: environment.localStorage ? "Available" : "Blocked" },
    { labelKey: "visSessionStorage", hintKey: "visSessionStorageHint", value: environment.sessionStorage ? "Available" : "Blocked" },
    { labelKey: "visHardware", hintKey: "visHardwareHint", value: String(environment.hardwareConcurrency || "—") },
    { labelKey: "visMemory", hintKey: "visMemoryHint", value: environment.deviceMemory ? `${environment.deviceMemory} GB` : "—" },
    { labelKey: "visTouch", hintKey: "visTouchHint", value: environment.touchSupport ? "Yes" : "No" },
    { labelKey: "visColorDepth", hintKey: "visColorDepthHint", value: `${environment.colorDepth}-bit` },
    { labelKey: "visDnt", hintKey: "visDntHint", value: environment.doNotTrack ?? "—" },
    { labelKey: "visTls", hintKey: "visTlsHint", value: report.tls_version || "—" },
    { labelKey: "visHttp", hintKey: "visHttpHint", value: report.http_version || "—" },
  ]
}

export function runVisibilityAnalysis(input: {
  report: ConnectionReport
  browser: BrowserDetails | null
  fingerprint: FingerprintData | null
  webRTC: WebRTCData | null
  environment: EnvironmentSignals
}): VisibilityAnalysis {
  const { report, browser, fingerprint, webRTC, environment } = input
  const consistency = analyzeConsistency(report, browser, webRTC, environment)
  const leaks = analyzeLeaks(report, webRTC, environment)
  const signalIssues = buildSignalIssues(report, browser, webRTC, environment)

  const connectionClass = report.residential
    ? "Residential"
    : report.datacenter || report.hosting
      ? "Datacenter"
      : report.mobile
        ? "Mobile"
        : report.asn_type || "—"

  return {
    consistencyScore: consistency.score,
    consistencySummaryKey: consistency.summaryKey,
    signalIssues,
    leaks,
    mismatches: consistency.mismatches,
    networkIdentity: [
      { labelKey: "netIsp", value: report.isp || "—" },
      { labelKey: "netAsn", value: report.asn ? `AS${report.asn}` : "—" },
      { labelKey: "netType", value: connectionClass },
      { labelKey: "netReverse", value: report.reverse_dns || report.hostname || "—" },
    ],
    browserIdentity: [
      { labelKey: "browserName", value: report.browser || browser?.name || "—" },
      { labelKey: "browserVersion", value: report.browser_version || browser?.version || "—" },
      { labelKey: "browserPlatform", value: browser?.platform || report.platform || "—" },
      { labelKey: "browserScreen", value: browser?.screen || "—" },
    ],
    visibility: buildWebsiteVisibility(report, browser, fingerprint, environment),
  }
}
