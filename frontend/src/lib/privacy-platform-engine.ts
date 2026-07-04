import { isDnsLeak } from "@/lib/format"
import {
  analyzeConsistency,
  buildSignalIssues,
  type LeakFinding,
  type SignalIssue,
} from "@/lib/visibility-analyzer-engine"
import type { TranslationKey } from "@/lib/i18n/translations"
import type {
  BrowserDetails,
  ConnectionReport,
  EnvironmentSignals,
  FingerprintData,
  ICECandidateEntry,
  WebRTCData,
} from "@/types/report"

export type VisibilityLevel = "visible" | "partial" | "unavailable"
export type RiskLevel = "low" | "medium" | "high"
export type UniquenessLevel = "low" | "medium" | "high"
export type CompatLevel = "likely" | "limited" | "unknown"
export type LeakVerdict = "clear" | "warning" | "critical"

export interface GroupedCandidate {
  category: ICECandidateEntry["category"]
  labelKey: TranslationKey
  ip: string
}

export interface LeakAnalysis {
  verdict: LeakVerdict
  verdictKey: TranslationKey
  whyKey: TranslationKey
  candidates: GroupedCandidate[]
  findings: LeakFinding[]
}

export interface ConnectionOverview {
  privacyScore: number
  consistencyScore: number
  connectionStatusKey: TranslationKey
  connectionType: string
  connectionTypeKey: TranslationKey
  riskLevel: RiskLevel
  riskKey: TranslationKey
  summaryKey: TranslationKey
  city: string
}

export interface VisibilityField {
  id: string
  labelKey: TranslationKey
  value: string
  level: VisibilityLevel
  whyKey: TranslationKey
}

export interface StreamingService {
  id: string
  name: string
  level: CompatLevel
  reasonKey: TranslationKey
}

export interface NetworkReputation {
  fraudScore: number
  blacklistKey: TranslationKey
  hosting: boolean
  vpn: boolean
  proxy: boolean
  tor: boolean
  residentialConfidence: number
  hostingConfidence: number
  asnReputationKey: TranslationKey
}

export interface Recommendation {
  id: string
  textKey: TranslationKey
}

export interface AdvancedBlock {
  titleKey: TranslationKey
  rows: { label: string; value: string }[]
}

export interface PrivacyPlatformAnalysis {
  overview: ConnectionOverview
  leak: LeakAnalysis
  visibility: VisibilityField[]
  signalIssues: SignalIssue[]
  consistencyScore: number
  consistencySummaryKey: TranslationKey
  fingerprintLevel: UniquenessLevel
  fingerprintKey: TranslationKey
  fingerprintWhyKey: TranslationKey
  streaming: StreamingService[]
  reputation: NetworkReputation
  recommendations: Recommendation[]
  advanced: AdvancedBlock[]
}

function connectionType(report: ConnectionReport): { label: string; key: TranslationKey } {
  if (report.tor) return { label: "Tor", key: "connTor" }
  if (report.mobile) return { label: "Mobile", key: "connMobile" }
  if (report.residential) return { label: "Residential", key: "connResidential" }
  if (report.datacenter || report.hosting) return { label: "Hosting", key: "connHosting" }
  if (report.vpn) return { label: "Tunnel", key: "connTunnel" }
  if (report.proxy) return { label: "Proxy", key: "connProxy" }
  return { label: "Direct", key: "connDirect" }
}

function riskLevel(report: ConnectionReport, leakVerdict: LeakVerdict, consistency: number): RiskLevel {
  if (leakVerdict === "critical" || consistency < 40 || report.risk_score >= 70) return "high"
  if (leakVerdict === "warning" || consistency < 65 || report.risk_score >= 40) return "medium"
  return "low"
}

function leakVerdict(findings: LeakFinding[]): { verdict: LeakVerdict; verdictKey: TranslationKey; whyKey: TranslationKey } {
  if (findings.some(f => f.severity === "critical")) {
    return { verdict: "critical", verdictKey: "leakVerdictCritical", whyKey: "leakWhyCritical" }
  }
  if (findings.some(f => f.severity === "warning")) {
    return { verdict: "warning", verdictKey: "leakVerdictWarning", whyKey: "leakWhyWarning" }
  }
  return { verdict: "clear", verdictKey: "leakVerdictClear", whyKey: "leakWhyClear" }
}

function groupCandidates(candidates: ICECandidateEntry[]): GroupedCandidate[] {
  const labelMap: Record<ICECandidateEntry["category"], TranslationKey> = {
    public: "candPublic",
    private: "candPrivate",
    host: "candHost",
    stun: "candStun",
    turn: "candTurn",
  }
  const seen = new Set<string>()
  const out: GroupedCandidate[] = []
  for (const c of candidates) {
    if (c.ip.endsWith(".local")) continue
    const key = `${c.category}:${c.ip}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ category: c.category, labelKey: labelMap[c.category], ip: c.ip })
  }
  return out
}

function vis(
  id: string,
  labelKey: TranslationKey,
  value: string,
  level: VisibilityLevel,
  whyKey: TranslationKey,
): VisibilityField {
  return { id, labelKey, value, level, whyKey }
}

function tlsVisibilityValue(report: ConnectionReport): string {
  const diag = report.tls_diagnostics
  if (diag?.client.tls_version) return diag.client.tls_version
  if (diag?.client.label) return diag.client.label
  if (report.tls_version && !report.tls_version.startsWith("tls")) return report.tls_version
  if (diag?.client.encrypted) return "tlsProxyHandled"
  return "—"
}

function httpVisibilityValue(report: ConnectionReport): string {
  return report.tls_diagnostics?.client.http_version || report.http_version || "—"
}

function levelFromBool(yes: boolean, partial = false): VisibilityLevel {
  if (yes) return "visible"
  if (partial) return "partial"
  return "unavailable"
}

function estimateFingerprint(fingerprint: FingerprintData | null, env: EnvironmentSignals): {
  level: UniquenessLevel
  key: TranslationKey
  whyKey: TranslationKey
} {
  let score = 0
  if (fingerprint?.canvas && fingerprint.canvas !== "Blocked") score += 25
  if (fingerprint?.webglRenderer && !fingerprint.webglRenderer.includes("Generic")) score += 25
  if (fingerprint?.audio && fingerprint.audio !== "Blocked") score += 20
  if ((fingerprint?.fonts?.length ?? 0) >= 4) score += 15
  if (env.hardwareConcurrency > 0) score += 10
  if (env.deviceMemory) score += 5

  if (score >= 65) return { level: "high", key: "fpHigh", whyKey: "fpWhyHigh" }
  if (score >= 35) return { level: "medium", key: "fpMedium", whyKey: "fpWhyMedium" }
  return { level: "low", key: "fpLow", whyKey: "fpWhyLow" }
}

const STREAMING_SERVICES = [
  "ChatGPT", "Gemini", "Claude", "Copilot", "Spotify", "Netflix", "Disney+", "Prime Video",
  "Steam", "Epic Games", "PlayStation", "Xbox", "Telegram Voice", "Discord Voice",
]

function estimateStreaming(
  name: string,
  report: ConnectionReport,
  consistency: number,
  leakVerdict: LeakVerdict,
): { level: CompatLevel; reasonKey: TranslationKey } {
  const strict = ["Netflix", "Disney+", "Prime Video", "PlayStation", "Xbox"]
  const ai = ["ChatGPT", "Gemini", "Claude", "Copilot"]

  if (leakVerdict === "critical") {
    return { level: "limited", reasonKey: "streamReasonLeak" }
  }
  if (consistency < 50) {
    return { level: "limited", reasonKey: "streamReasonInconsistent" }
  }
  if (report.datacenter && strict.includes(name)) {
    return { level: "limited", reasonKey: "streamReasonHosting" }
  }
  if ((report.vpn || report.proxy) && strict.includes(name)) {
    return { level: "unknown", reasonKey: "streamReasonTunnel" }
  }
  if (ai.includes(name) && report.datacenter) {
    return { level: "limited", reasonKey: "streamReasonDatacenter" }
  }
  if (consistency >= 75 && leakVerdict === "clear") {
    return { level: "likely", reasonKey: "streamReasonOk" }
  }
  return { level: "unknown", reasonKey: "streamReasonUnknown" }
}

function buildRecommendations(
  signalIssues: SignalIssue[],
  leak: LeakAnalysis,
  env: EnvironmentSignals,
  fp: UniquenessLevel,
): Recommendation[] {
  const recs: Recommendation[] = []
  if (signalIssues.some(s => s.id === "webrtc-ip") || leak.verdict !== "clear") {
    recs.push({ id: "webrtc", textKey: "recWebrtc" })
  }
  if (signalIssues.some(s => s.id === "ip-timezone")) {
    recs.push({ id: "tz", textKey: "recTimezone" })
  }
  if (signalIssues.some(s => s.id === "ip-language")) {
    recs.push({ id: "lang", textKey: "recLanguage" })
  }
  if (signalIssues.some(s => s.id === "ipv6-tunnel")) {
    recs.push({ id: "ipv6", textKey: "recIpv6" })
  }
  if (signalIssues.some(s => s.id === "dns-resolver")) {
    recs.push({ id: "dns", textKey: "recDns" })
  }
  if (reportNeedsResidential(signalIssues)) {
    recs.push({ id: "residential", textKey: "recResidential" })
  }
  if (fp === "high") recs.push({ id: "fp", textKey: "recFingerprint" })
  if (env.doNotTrack !== "1") recs.push({ id: "dnt", textKey: "recDnt" })
  return recs.slice(0, 6)
}

function reportNeedsResidential(issues: SignalIssue[]): boolean {
  return issues.length >= 2
}

function overviewSummaryKey(
  leak: LeakVerdict,
  consistency: number,
  risk: RiskLevel,
): TranslationKey {
  if (leak === "clear" && consistency >= 75) return "summaryProtected"
  if (leak === "critical" || risk === "high") return "summaryAtRisk"
  if (consistency < 60) return "summaryInconsistent"
  return "summaryModerate"
}

function connectionStatusKey(report: ConnectionReport, leak: LeakVerdict): TranslationKey {
  if (leak === "critical") return "statusLeak"
  if (report.vpn || report.proxy || report.tor) return "statusTunneled"
  return "statusDirect"
}

function computePrivacyScore(consistency: number, leak: LeakVerdict, fp: UniquenessLevel, risk: number): number {
  const leakPts = leak === "clear" ? 35 : leak === "warning" ? 18 : 5
  const fpPts = fp === "low" ? 15 : fp === "medium" ? 10 : 5
  const riskPts = Math.max(0, 10 - risk / 10)
  const raw = consistency * 0.4 + leakPts + fpPts + riskPts
  return Math.round(Math.min(100, Math.max(0, raw)))
}

function buildVisibilityFields(
  report: ConnectionReport,
  browser: BrowserDetails | null,
  fingerprint: FingerprintData | null,
  env: EnvironmentSignals,
): VisibilityField[] {
  const cityLine = [report.city, report.region].filter(Boolean).join(", ") || "—"
  const langs = env.languages.length ? env.languages.join(", ") : env.locale

  return [
    vis("ip", "visPublicIp", report.ip, "visible", "whyPublicIp"),
    vis("loc", "visLocation", cityLine, "partial", "whyLocation"),
    vis("country", "visCountry", report.country || "—", "visible", "whyCountry"),
    vis("city", "visCity", report.city || "—", "partial", "whyCity"),
    vis("asn", "visAsn", report.asn ? `AS${report.asn}` : "—", "visible", "whyAsn"),
    vis("isp", "visIsp", report.isp || "—", "visible", "whyIsp"),
    vis("rdns", "visRdns", report.reverse_dns || report.hostname || "—", "visible", "whyRdns"),
    vis("browser", "visBrowser", report.browser || browser?.name || "—", "visible", "whyBrowser"),
    vis("bver", "visBrowserVer", report.browser_version || browser?.version || "—", "visible", "whyBrowserVer"),
    vis("os", "visOs", report.operating_system || browser?.os || "—", "visible", "whyOs"),
    vis("arch", "visArch", env.architecture, levelFromBool(env.architecture !== "—"), "whyArch"),
    vis("ua", "visUa", env.userAgent.slice(0, 64) + (env.userAgent.length > 64 ? "…" : ""), "visible", "whyUa"),
    vis("alang", "visAcceptLang", langs, "visible", "whyAcceptLang"),
    vis("lang", "visLanguage", env.locale, "visible", "whyLanguage"),
    vis("tz", "visTimezone", env.timezone, "visible", "whyTimezone"),
    vis("screen", "visScreen", browser?.screen || "—", "visible", "whyScreen"),
    vis("color", "visColorDepth", `${env.colorDepth}-bit`, "visible", "whyColor"),
    vis("touch", "visTouch", env.touchSupport ? "Yes" : "No", "visible", "whyTouch"),
    vis("cookies", "visCookies", env.cookiesEnabled ? "Enabled" : "Disabled", levelFromBool(env.cookiesEnabled), "whyCookies"),
    vis("dnt", "visDnt", env.doNotTrack ?? "—", levelFromBool(env.doNotTrack === "1", true), "whyDnt"),
    vis("canvas", "visCanvas", fingerprint?.canvas || "—", levelFromBool(!!fingerprint?.canvas && fingerprint.canvas !== "Blocked"), "whyCanvas"),
    vis("webgl", "visWebgl", fingerprint?.webglRenderer?.slice(0, 40) || "—", levelFromBool(!!fingerprint?.webglRenderer), "whyWebgl"),
    vis("audio", "visAudio", fingerprint?.audio || "—", levelFromBool(!!fingerprint?.audio && fingerprint.audio !== "Blocked"), "whyAudio"),
    vis("webgpu", "visWebgpu", env.webgpu === "available" ? "Available" : "Unavailable", levelFromBool(env.webgpu === "available"), "whyWebgpu"),
    vis("hw", "visHardware", String(env.hardwareConcurrency || "—"), "visible", "whyHardware"),
    vis("mem", "visMemory", env.deviceMemory ? `${env.deviceMemory} GB` : "—", levelFromBool(!!env.deviceMemory, true), "whyMemory"),
    vis("battery", "visBattery", env.batteryApi ? "Available" : "Unavailable", levelFromBool(env.batteryApi), "whyBattery"),
    vis("clip", "visClipboard", env.clipboardApi ? "Available" : "Unavailable", levelFromBool(env.clipboardApi), "whyClipboard"),
    vis("bt", "visBluetooth", env.bluetoothApi ? "Available" : "Unavailable", levelFromBool(env.bluetoothApi), "whyBluetooth"),
    vis("usb", "visUsb", env.usbApi ? "Available" : "Unavailable", levelFromBool(env.usbApi), "whyUsb"),
    vis("media", "visMedia", String(env.mediaDevicesCount), levelFromBool(env.mediaDevicesCount > 0, env.permissionsApi), "whyMedia"),
    vis("perm", "visPermissions", env.permissionsApi ? "Supported" : "Unavailable", levelFromBool(env.permissionsApi), "whyPermissions"),
    vis("js", "visJs", "Enabled", "visible", "whyJs"),
    vis("tls", "visTls", tlsVisibilityValue(report), report.https || report.tls_diagnostics?.client.encrypted ? "visible" : "partial", "whyTls"),
    vis("http", "visHttp", httpVisibilityValue(report), "visible", "whyHttp"),
    vis("alpn", "visAlpn", report.alpn || report.tls_diagnostics?.client.alpn || "—", levelFromBool(!!report.alpn || !!report.tls_diagnostics?.client.alpn), "whyAlpn"),
    vis("cipher", "visCipher", (report.cipher_suite || report.tls_diagnostics?.client.cipher_suite || "—").slice(0, 32), levelFromBool(!!report.cipher_suite || !!report.tls_diagnostics?.client.cipher_suite), "whyCipher"),
    vis("v4", "visIpv4", report.ipv4 ? "Yes" : "No", levelFromBool(report.ipv4), "whyIpv4"),
    vis("v6", "visIpv6", report.ipv6 ? "Yes" : "No", levelFromBool(report.ipv6), "whyIpv6"),
  ]
}

export function runPrivacyPlatformAnalysis(input: {
  report: ConnectionReport
  browser: BrowserDetails | null
  fingerprint: FingerprintData | null
  webRTC: WebRTCData | null
  environment: EnvironmentSignals
  leaks: LeakFinding[]
}): PrivacyPlatformAnalysis {
  const { report, browser, fingerprint, webRTC, environment, leaks } = input

  const consistency = analyzeConsistency(report, browser, webRTC, environment)
  const signalIssues = buildSignalIssues(report, browser, webRTC, environment)
  const leakMeta = leakVerdict(leaks.filter(l => l.severity !== "ok"))
  const effectiveFindings = leaks.filter(l => l.severity !== "ok")
  const fp = estimateFingerprint(fingerprint, environment)
  const conn = connectionType(report)
  const risk = riskLevel(report, leakMeta.verdict, consistency.score)
  const privacyScore = computePrivacyScore(consistency.score, leakMeta.verdict, fp.level, report.risk_score)

  const streaming = STREAMING_SERVICES.map(name => {
    const est = estimateStreaming(name, report, consistency.score, leakMeta.verdict)
    return { id: name.toLowerCase().replace(/\s+/g, "-"), name, level: est.level, reasonKey: est.reasonKey }
  })

  const residentialConf = report.residential ? 85 : report.mobile ? 70 : report.datacenter ? 15 : 50
  const hostingConf = report.datacenter || report.hosting ? 90 : 20

  return {
    overview: {
      privacyScore,
      consistencyScore: consistency.score,
      connectionStatusKey: connectionStatusKey(report, leakMeta.verdict),
      connectionType: conn.label,
      connectionTypeKey: conn.key,
      riskLevel: risk,
      riskKey: risk === "high" ? "riskHigh" : risk === "medium" ? "riskMedium" : "riskLow",
      summaryKey: overviewSummaryKey(leakMeta.verdict, consistency.score, risk),
      city: report.city || "—",
    },
    leak: {
      verdict: leakMeta.verdict,
      verdictKey: leakMeta.verdictKey,
      whyKey: leakMeta.whyKey,
      candidates: groupCandidates(webRTC?.iceCandidates ?? []),
      findings: effectiveFindings,
    },
    visibility: buildVisibilityFields(report, browser, fingerprint, environment),
    signalIssues,
    consistencyScore: consistency.score,
    consistencySummaryKey: consistency.summaryKey,
    fingerprintLevel: fp.level,
    fingerprintKey: fp.key,
    fingerprintWhyKey: fp.whyKey,
    streaming,
    reputation: {
      fraudScore: report.risk_score,
      blacklistKey: report.risk_score >= 60 ? "repBlacklistMaybe" : "repBlacklistClear",
      hosting: report.hosting || report.datacenter,
      vpn: report.vpn,
      proxy: report.proxy,
      tor: report.tor,
      residentialConfidence: residentialConf,
      hostingConfidence: hostingConf,
      asnReputationKey: report.datacenter ? "repAsnHosting" : "repAsnNormal",
    },
    recommendations: buildRecommendations(signalIssues, { verdict: leakMeta.verdict } as LeakAnalysis, environment, fp.level),
    advanced: [
      {
        titleKey: "advTls",
        rows: [
          { label: "Client TLS", value: tlsVisibilityValue(report) },
          { label: "Client HTTP", value: httpVisibilityValue(report) },
          { label: "Backend TLS", value: report.tls_diagnostics?.backend.tls_version || report.tls_diagnostics?.backend.label || "—" },
          { label: "Cipher", value: report.cipher_suite || report.tls_diagnostics?.client.cipher_suite || "—" },
          { label: "ALPN", value: report.alpn || report.tls_diagnostics?.client.alpn || "—" },
          { label: "HSTS", value: report.hsts ? "Yes" : "No" },
          { label: "Proxy", value: report.tls_diagnostics?.behind_reverse_proxy ? "Yes" : "No" },
        ],
      },
      {
        titleKey: "advWebRTC",
        rows: (webRTC?.iceCandidates ?? []).slice(0, 20).map((c, i) => ({
          label: `#${i + 1} ${c.type}`,
          value: c.ip,
        })),
      },
      {
        titleKey: "advFingerprint",
        rows: [
          { label: "Canvas", value: fingerprint?.canvas || "—" },
          { label: "WebGL", value: fingerprint?.webglRenderer || "—" },
          { label: "Audio", value: fingerprint?.audio || "—" },
          { label: "Fonts", value: String(fingerprint?.fonts?.length ?? 0) },
        ],
      },
      {
        titleKey: "advGeo",
        rows: [
          { label: "Lat", value: String(report.latitude || "—") },
          { label: "Lng", value: String(report.longitude || "—") },
          { label: "TZ (IP)", value: report.timezone || "—" },
          { label: "TZ (JS)", value: environment.timezone },
        ],
      },
    ],
  }
}
