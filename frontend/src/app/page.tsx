"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  Eye,
  MapPin,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from "lucide-react"
import { collectClientDiagnostics } from "@/lib/diagnostics"
import {
  buildExposureItems,
  countryCodeToFlag,
  exposureLevelMeta,
  isDnsLeak,
  isDnsSafe,
  resolveWebRTCStatus,
  type ExposureLevel,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  Branding,
  BrowserDetails,
  ConnectionReport,
  FingerprintData,
  ServiceStatus,
  WebRTCData,
} from "@/types/report"

const defaultBranding: Branding = {
  name: "NeoCheck",
  copyright_text: "NeoCheck",
  footer_text: "",
  support_url: "https://github.com/neoauroraproject/neocheck/issues",
  github_url: "https://github.com/neoauroraproject/neocheck",
  documentation_url: "https://github.com/neoauroraproject/neocheck/tree/main/docs",
}

type StatusTone = "ok" | "warn" | "bad" | "neutral"

const toneStyles: Record<StatusTone, { border: string; text: string; bg: string }> = {
  ok: {
    border: "border-l-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-[var(--surface)]",
  },
  warn: {
    border: "border-l-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-[var(--surface)]",
  },
  bad: {
    border: "border-l-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    bg: "bg-[var(--surface)]",
  },
  neutral: {
    border: "border-l-zinc-400 dark:border-l-zinc-600",
    text: "text-[var(--fg)]",
    bg: "bg-[var(--surface)]",
  },
}

function StatusCard({
  title,
  status,
  detail,
  tone,
}: {
  title: string
  status: string
  detail: string
  tone: StatusTone
}) {
  const s = toneStyles[tone]
  return (
    <div className={cn("rounded-xl border border-[var(--border)] border-l-[3px] p-4", s.border, s.bg)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <p className={cn("text-base font-semibold mt-1", s.text)}>{status}</p>
      <p className="text-[12px] text-[var(--muted)] mt-1 leading-relaxed">{detail}</p>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const stroke = score >= 80 ? "#10b981" : score >= 60 ? "#0ea5e9" : score >= 40 ? "#f59e0b" : "#f43f5e"

  return (
    <div className="relative size-32 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-[var(--border)]" />
        <motion.circle
          cx="60" cy="60" r={radius}
          fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{score}</span>
        <span className="text-[10px] text-[var(--muted)]">/ 100</span>
      </div>
    </div>
  )
}

function ExposureChip({ label, value, level, hint }: { label: string; value: string; level: ExposureLevel; hint: string }) {
  const meta = exposureLevelMeta[level]
  return (
    <div
      className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--muted)]/40 transition-colors"
      title={hint}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] text-[var(--muted)]">{label}</span>
        <span className={cn("size-2 rounded-full shrink-0", meta.dot)} title={meta.label} />
      </div>
      <p className="text-[13px] font-medium truncate">{value}</p>
      <p className="text-[10px] text-[var(--muted)] mt-1 opacity-0 group-hover:opacity-100 transition-opacity leading-snug">
        {hint}
      </p>
    </div>
  )
}

function MetricRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <span className={cn("text-[12px] text-right truncate max-w-[58%]", mono && "font-mono text-[11px]")}>{value || "—"}</span>
    </div>
  )
}

function Section({ title, summary, children, defaultOpen = false }: {
  title: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{title}</p>
          {summary && !open && <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{summary}</p>}
        </div>
        <ChevronDown className={cn("size-4 text-[var(--muted)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 border-t border-[var(--border)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function webrtcTone(status: WebRTCData["status"]): StatusTone {
  if (status === "Safe") return "ok"
  if (status === "Leak") return "bad"
  if (status === "Partial") return "warn"
  return "neutral"
}

function webrtcCopy(status: WebRTCData["status"]): { status: string; detail: string } {
  switch (status) {
    case "Safe": return { status: "Secure", detail: "No public IP exposed through WebRTC/STUN." }
    case "Leak": return { status: "Leaking", detail: "Your real IP may be visible despite VPN or proxy." }
    case "Partial": return { status: "Partial", detail: "Local network addresses are visible to websites." }
    case "Unsupported": return { status: "N/A", detail: "WebRTC is disabled or unavailable." }
    default: return { status: "Checking…", detail: "Scanning ICE candidates." }
  }
}

function dnsTone(leak?: string): StatusTone {
  if (isDnsSafe(leak)) return "ok"
  if (isDnsLeak(leak)) return "bad"
  return "warn"
}

function dnsCopy(leak?: string): { status: string; detail: string } {
  if (isDnsSafe(leak)) return { status: "Protected", detail: "DNS requests appear routed correctly." }
  if (isDnsLeak(leak)) return { status: "Leaking", detail: "DNS may reveal your ISP or real location." }
  return { status: "Unknown", detail: "Could not fully verify DNS routing." }
}

function tunnelTone(vpn: boolean, proxy: boolean, tor: boolean): StatusTone {
  if (tor || vpn) return "ok"
  if (proxy) return "warn"
  return "bad"
}

function tunnelCopy(vpn: boolean, proxy: boolean, tor: boolean): { status: string; detail: string } {
  if (tor) return { status: "Tor", detail: "Traffic exits through the Tor network." }
  if (vpn) return { status: "VPN active", detail: "Your IP is masked by the VPN server." }
  if (proxy) return { status: "Proxy", detail: "A proxy is detected — partial masking only." }
  return { status: "Direct", detail: "No VPN/proxy — your real IP is exposed to sites." }
}

function reputationTone(risk: number): StatusTone {
  if (risk < 25) return "ok"
  if (risk < 50) return "warn"
  return "bad"
}

export default function Home() {
  const [report, setReport] = useState<ConnectionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [copied, setCopied] = useState(false)
  const [branding, setBranding] = useState(defaultBranding)
  const [fingerprint, setFingerprint] = useState<FingerprintData | null>(null)
  const [webRTC, setWebRTC] = useState<WebRTCData | null>(null)
  const [browser, setBrowser] = useState<BrowserDetails | null>(null)
  const [services, setServices] = useState<Record<string, ServiceStatus>>({})

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    fetch("/api/branding").then(r => r.ok ? r.json() : null).then(d => { if (d) setBranding(d) }).catch(() => {})
  }, [])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/check")
      if (!res.ok) throw new Error("check failed")
      const data = (await res.json()) as ConnectionReport
      const client = await collectClientDiagnostics(data.ip, data.vpn || data.proxy || data.tor)
      setFingerprint(client.fingerprint)
      setWebRTC(client.webRTC)
      setBrowser(client.browser)
      setServices(client.services)
      setReport(data)
    } catch {
      setError("Could not reach the diagnostics service.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runAnalysis() }, [runAnalysis])

  const webrtcStatus = resolveWebRTCStatus(webRTC?.status, report?.webrtc_leak)

  const exposureItems = useMemo(() => {
    if (!report) return []
    return buildExposureItems(report, browser, fingerprint, webRTC ? { ...webRTC, status: webrtcStatus } : null)
  }, [report, browser, fingerprint, webRTC, webrtcStatus])

  const exposedCount = exposureItems.filter(i => i.level === "exact").length
  const protectedCount = exposureItems.filter(i => i.level === "hidden").length

  const copyIP = () => {
    if (!report?.ip) return
    navigator.clipboard.writeText(report.ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const flagEmoji = countryCodeToFlag(report?.country_code)
  const locationLine = [report?.city, report?.region].filter(Boolean).join(", ")

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--muted)]" />
            <span className="text-sm font-semibold">{branding.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={runAnalysis} disabled={loading} className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-40" aria-label="Refresh">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <button type="button" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-5 py-8">
        <AnimatePresence mode="wait">
          {loading && !report ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-32 gap-3">
              <div className="size-8 border-2 border-[var(--border)] border-t-[var(--fg)] rounded-full animate-spin" />
              <p className="text-sm text-[var(--muted)]">Analyzing your connection…</p>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32 space-y-3">
              <ShieldAlert className="size-9 text-[var(--muted)] mx-auto" />
              <p className="font-medium">Scan failed</p>
              <p className="text-sm text-[var(--muted)]">{error}</p>
              <button type="button" onClick={runAnalysis} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)]">Retry</button>
            </motion.div>
          ) : report ? (
            <motion.div key="results" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

              {/* Location + score */}
              <div className="grid md:grid-cols-5 gap-4">
                <div className="md:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-center shrink-0 w-[72px]">
                      <span className="text-5xl leading-none" role="img" aria-label={report.country}>{flagEmoji}</span>
                      {report.country_code && (
                        <span className="text-[10px] font-mono text-[var(--muted)] mt-2 uppercase">{report.country_code}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Detected location</p>
                      <h1 className="text-xl md:text-2xl font-bold mt-1 truncate">{report.country || "Unknown country"}</h1>
                      <p className="text-sm text-[var(--muted)] mt-1 flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        {locationLine || "City unavailable"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                        {report.timezone && <span className="px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted)]">{report.timezone}</span>}
                        <span className="px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted)]">
                          {report.residential ? "Residential IP" : report.datacenter || report.hosting ? "Datacenter IP" : "Network IP"}
                        </span>
                        {report.asn ? <span className="px-2 py-0.5 rounded-md border border-[var(--border)] font-mono text-[var(--muted)]">AS{report.asn}</span> : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col items-center justify-center text-center gap-2">
                  <ScoreRing score={report.score} />
                  <p className="text-xs font-medium">{report.status || "Analyzed"}</p>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">{report.summary}</p>
                </div>
              </div>

              {/* How websites see you */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                      <Eye className="size-4 text-[var(--muted)]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">How websites see you</h2>
                      <p className="text-[12px] text-[var(--muted)] mt-0.5">
                        Data any site can collect without asking permission
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px] sm:text-right">
                    <span><span className="inline-block size-2 rounded-full bg-rose-500 mr-1.5 align-middle" />{exposedCount} fully visible</span>
                    <span><span className="inline-block size-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />{protectedCount} protected</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {exposureItems.map(item => (
                    <ExposureChip key={item.label} {...item} />
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-[var(--border)] flex flex-wrap gap-4 text-[10px] text-[var(--muted)]">
                  {(Object.entries(exposureLevelMeta) as [ExposureLevel, typeof exposureLevelMeta.exact][]).map(([key, meta]) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* IP */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Public IP</p>
                  <p className="font-mono text-base font-semibold mt-0.5 truncate">{report.ip}</p>
                  <p className="text-[12px] text-[var(--muted)] mt-1 truncate">{report.isp}{report.organization ? ` · ${report.organization}` : ""}</p>
                </div>
                <button type="button" onClick={copyIP} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.04] shrink-0">
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {/* Security status — readable, minimal color */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2 px-0.5">Security checks</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <StatusCard title="WebRTC" {...webrtcCopy(webrtcStatus)} tone={webrtcTone(webrtcStatus)} />
                  <StatusCard title="DNS leak" {...dnsCopy(report.dns_leak)} tone={dnsTone(report.dns_leak)} />
                  <StatusCard title="Connection route" {...tunnelCopy(!!report.vpn, !!report.proxy, !!report.tor)} tone={tunnelTone(!!report.vpn, !!report.proxy, !!report.tor)} />
                  <StatusCard
                    title="IP reputation"
                    status={report.risk_score < 25 ? "Clean" : report.risk_score < 50 ? "Moderate risk" : "Flagged"}
                    detail={report.risk_score < 25 ? "No major abuse signals on this IP." : `Risk score: ${report.risk_score}%`}
                    tone={reputationTone(report.risk_score)}
                  />
                </div>
              </div>

              {/* Quick facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Browser", value: report.browser || browser?.name || "—" },
                  { label: "OS", value: report.operating_system || browser?.os || "—" },
                  { label: "HTTPS", value: report.https ? (report.tls_version || "Enabled") : "Disabled" },
                  { label: "IPv6", value: report.ipv6 ? "Active" : "Inactive" },
                ].map(row => (
                  <div key={row.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                    <p className="text-[10px] text-[var(--muted)]">{row.label}</p>
                    <p className="text-[13px] font-medium truncate mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>

              {/* Full report */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)] px-0.5">Technical details</p>

                {webRTC && (
                  <Section title="WebRTC scan" summary={`${webrtcStatus} · ${webRTC.publicIPs.length} public candidate(s)`} defaultOpen={webrtcStatus === "Leak"}>
                    <MetricRow label="Status" value={webrtcStatus} />
                    <MetricRow label="Server report" value={report.webrtc_leak || "—"} />
                    <MetricRow label="Public IPs" value={webRTC.publicIPs.join(", ") || "None"} mono />
                    <MetricRow label="Local IPv4" value={webRTC.localIPv4.join(", ") || "None"} mono />
                    <MetricRow label="mDNS" value={webRTC.mdnsEnabled ? "Active" : "Inactive"} />
                  </Section>
                )}

                <Section title="Network" summary={`${report.isp || "—"} · ${report.asn_type || "Unknown type"}`}>
                  <MetricRow label="ISP" value={report.isp} />
                  <MetricRow label="Organization" value={report.organization} />
                  <MetricRow label="Reverse DNS" value={report.reverse_dns || report.hostname} mono />
                  <MetricRow label="Coordinates" value={report.latitude && report.longitude ? `${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)}` : "—"} mono />
                </Section>

                <Section title="Privacy flags" summary={`VPN ${report.vpn ? "yes" : "no"} · DNS ${report.dns_leak || "unknown"}`}>
                  <MetricRow label="VPN" value={report.vpn ? "Detected" : "Not detected"} />
                  <MetricRow label="Proxy" value={report.proxy ? "Detected" : "Not detected"} />
                  <MetricRow label="Tor" value={report.tor ? "Detected" : "Not detected"} />
                  <MetricRow label="DNS status" value={report.dns_leak || "Unknown"} />
                  <MetricRow label="Risk score" value={`${report.risk_score}%`} />
                </Section>

                {fingerprint && (
                  <Section title="Fingerprint" summary="Tracking identifiers">
                    <MetricRow label="Canvas" value={fingerprint.canvas} mono />
                    <MetricRow label="WebGL vendor" value={fingerprint.webglVendor} />
                    <MetricRow label="WebGL renderer" value={fingerprint.webglRenderer} />
                    <MetricRow label="Audio hash" value={fingerprint.audio} mono />
                  </Section>
                )}

                <Section title="TLS / HTTPS" summary={report.https ? "Encrypted" : "Not encrypted"}>
                  <MetricRow label="HTTPS" value={report.https ? "Yes" : "No"} />
                  <MetricRow label="TLS version" value={report.tls_version || "—"} />
                  <MetricRow label="HTTP version" value={report.http_version || "—"} />
                  <MetricRow label="HSTS" value={report.hsts ? "Yes" : "No"} />
                  <MetricRow label="Certificate" value={report.cert_issuer || "—"} />
                </Section>

                {Object.keys(services).length > 0 && (
                  <Section title="Service reachability" summary="External access test">
                    {Object.entries(services).map(([name, status]) => (
                      <MetricRow key={name} label={name} value={status} />
                    ))}
                  </Section>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[var(--border)] mt-auto">
        <div className="mx-auto max-w-3xl px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
          <span>© {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
          <div className="flex items-center gap-4">
            {branding.documentation_url && (
              <a href={branding.documentation_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-[var(--fg)]">
                Docs <ArrowUpRight className="size-3" />
              </a>
            )}
            {branding.github_url && (
              <a href={branding.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-[var(--fg)]">
                GitHub <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
