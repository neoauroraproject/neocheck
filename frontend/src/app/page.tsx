"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  Globe2,
  MapPin,
  Moon,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Wifi,
} from "lucide-react"
import { collectClientDiagnostics } from "@/lib/diagnostics"
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

type StatusVariant = "safe" | "warn" | "danger" | "info"

const variantStyles: Record<StatusVariant, {
  card: string
  icon: string
  badge: string
  glow: string
}> = {
  safe: {
    card: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent",
    icon: "text-emerald-400 bg-emerald-500/15",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]",
  },
  warn: {
    card: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent",
    icon: "text-amber-400 bg-amber-500/15",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.35)]",
  },
  danger: {
    card: "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent",
    icon: "text-rose-400 bg-rose-500/15",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(244,63,94,0.4)]",
  },
  info: {
    card: "border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent",
    icon: "text-sky-400 bg-sky-500/15",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(56,189,248,0.3)]",
  },
}

function SecurityCard({
  title,
  headline,
  subtitle,
  variant,
  icon: Icon,
  delay = 0,
}: {
  title: string
  headline: string
  subtitle: string
  variant: StatusVariant
  icon: React.ElementType
  delay?: number
}) {
  const s = variantStyles[variant]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-2xl border p-4 overflow-hidden backdrop-blur-sm",
        s.card,
        variant !== "info" && s.glow,
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)] mb-2">{title}</p>
          <p className="text-lg font-bold tracking-tight leading-tight">{headline}</p>
          <p className="text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed">{subtitle}</p>
        </div>
        <div className={cn("p-2.5 rounded-xl shrink-0", s.icon)}>
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      </div>
    </motion.div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 85 ? "#34d399" : score >= 65 ? "#38bdf8" : score >= 45 ? "#fbbf24" : "#fb7185"

  return (
    <div className="relative size-36 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight">{score}</span>
        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider mt-0.5">Score</span>
      </div>
    </div>
  )
}

function MetricRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5 border-b border-white/[0.06] last:border-0">
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <span className={cn("text-[12px] text-right truncate max-w-[58%]", mono && "font-mono text-[11px]")}>
        {value || "—"}
      </span>
    </div>
  )
}

function Section({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string
  summary?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{title}</p>
          {summary && !open && <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{summary}</p>}
        </div>
        <ChevronDown className={cn("size-4 text-[var(--muted)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-[var(--border)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function webrtcVariant(status?: WebRTCData["status"]): { variant: StatusVariant; headline: string; subtitle: string } {
  switch (status) {
    case "Safe":
      return { variant: "safe", headline: "Secure", subtitle: "No public IP leak via WebRTC" }
    case "Leak":
      return { variant: "danger", headline: "Leak!", subtitle: "Real IP may be exposed through STUN" }
    case "Partial":
      return { variant: "warn", headline: "Partial", subtitle: "Local network addresses visible" }
    case "Unsupported":
      return { variant: "info", headline: "N/A", subtitle: "WebRTC not available in browser" }
    default:
      return { variant: "info", headline: "Scanning…", subtitle: "Checking ICE candidates" }
  }
}

function dnsVariant(leak?: string): { variant: StatusVariant; headline: string; subtitle: string } {
  if (leak === "No Leak") return { variant: "safe", headline: "Protected", subtitle: "DNS queries stay within tunnel" }
  if (leak === "Leak") return { variant: "danger", headline: "Leaking!", subtitle: "ISP DNS may reveal real location" }
  return { variant: "warn", headline: "Unknown", subtitle: "Could not verify DNS routing" }
}

function tunnelVariant(vpn: boolean, proxy: boolean, tor: boolean): { variant: StatusVariant; headline: string; subtitle: string } {
  if (tor) return { variant: "safe", headline: "Tor", subtitle: "Traffic routed through Tor network" }
  if (vpn) return { variant: "safe", headline: "VPN Active", subtitle: "Connection is tunneled & obfuscated" }
  if (proxy) return { variant: "warn", headline: "Proxy", subtitle: "Proxy detected — partial masking" }
  return { variant: "danger", headline: "Exposed", subtitle: "Direct connection — real IP visible" }
}

function reputationVariant(risk: number): { variant: StatusVariant; headline: string; subtitle: string } {
  if (risk < 20) return { variant: "safe", headline: "Clean IP", subtitle: "No fraud flags on reputation DBs" }
  if (risk < 50) return { variant: "warn", headline: "Moderate", subtitle: "Some risk signals detected" }
  return { variant: "danger", headline: "Flagged", subtitle: "High abuse score — may be blocked" }
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
    fetch("/api/branding")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBranding(data) })
      .catch(() => {})
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

  const copyIP = () => {
    if (!report?.ip) return
    navigator.clipboard.writeText(report.ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const flagUrl = report?.country_code
    ? `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${report.country_code.toLowerCase()}.svg`
    : null

  const webrtc = webrtcVariant(webRTC?.status)
  const dns = dnsVariant(report?.dns_leak)
  const tunnel = tunnelVariant(!!report?.vpn, !!report?.proxy, !!report?.tor)
  const reputation = reputationVariant(report?.risk_score ?? 0)

  return (
    <div className="min-h-screen flex flex-col mesh-bg">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="size-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">{branding.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/[0.06] transition-all disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/[0.06] transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-5 py-8">
        <AnimatePresence mode="wait">
          {loading && !report ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-36 gap-6"
            >
              <div className="relative size-16">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 animate-glow-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Scanning your connection</p>
                <p className="text-xs text-[var(--muted)] mt-1">IP · DNS · WebRTC · Security</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-36 space-y-4">
              <ShieldAlert className="size-10 text-rose-400 mx-auto" />
              <p className="font-semibold">Scan failed</p>
              <p className="text-sm text-[var(--muted)]">{error}</p>
              <button type="button" onClick={runAnalysis} className="text-sm px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                Retry
              </button>
            </motion.div>
          ) : report ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Location hero + score */}
              <div className="grid md:grid-cols-5 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="md:col-span-3 relative rounded-3xl border border-[var(--border)] overflow-hidden bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-cyan-600/10 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgba(99,102,241,0.35)]"
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMGgxdjFoLTF6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-60 pointer-events-none" />
                  <div className="relative p-6 flex gap-5">
                    <div className="shrink-0">
                      {flagUrl ? (
                        <div className="size-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shadow-black/30 animate-float">
                          <img src={flagUrl} alt={report.country} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="size-20 rounded-2xl bg-white/10 flex items-center justify-center">
                          <Globe2 className="size-8 text-indigo-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/80 mb-1">Your location</p>
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                        {report.country || "Unknown"}
                      </h1>
                      <p className="text-base text-[var(--muted)] mt-1 flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-cyan-400" />
                        {[report.city, report.region].filter(Boolean).join(", ") || "City unknown"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {report.timezone && (
                          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-200">
                            {report.timezone}
                          </span>
                        )}
                        <span className={cn(
                          "text-[10px] font-medium px-2.5 py-1 rounded-full border",
                          report.residential
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/25",
                        )}>
                          {report.residential ? "Residential" : "Datacenter"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="md:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-5 flex flex-col items-center justify-center gap-3"
                >
                  <ScoreRing score={report.score} />
                  <p className="text-[11px] text-center text-[var(--muted)] leading-relaxed max-w-[180px]">
                    {report.summary || "Overall privacy & connection health"}
                  </p>
                </motion.div>
              </div>

              {/* IP bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Public IP Address</p>
                  <p className="font-mono text-lg font-semibold tracking-tight truncate">{report.ip}</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1 truncate">{report.isp}{report.asn ? ` · AS${report.asn}` : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={copyIP}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shrink-0"
                >
                  <Copy className="size-3.5" />
                  {copied ? "Copied!" : "Copy IP"}
                </button>
              </motion.div>

              {/* Security at-a-glance */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-3 px-1">
                  Security at a glance
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <SecurityCard
                    title="WebRTC"
                    headline={webrtc.headline}
                    subtitle={webrtc.subtitle}
                    variant={webrtc.variant}
                    icon={Wifi}
                    delay={0.15}
                  />
                  <SecurityCard
                    title="DNS Leak"
                    headline={dns.headline}
                    subtitle={dns.subtitle}
                    variant={dns.variant}
                    icon={Globe2}
                    delay={0.2}
                  />
                  <SecurityCard
                    title="Tunnel"
                    headline={tunnel.headline}
                    subtitle={tunnel.subtitle}
                    variant={tunnel.variant}
                    icon={Shield}
                    delay={0.25}
                  />
                  <SecurityCard
                    title="IP Reputation"
                    headline={reputation.headline}
                    subtitle={reputation.subtitle}
                    variant={reputation.variant}
                    icon={ShieldAlert}
                    delay={0.3}
                  />
                </div>
              </div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { label: "Browser", value: report.browser || browser?.name || "—", color: "from-violet-500/20 to-violet-500/5 border-violet-500/20" },
                  { label: "HTTPS", value: report.https ? report.tls_version || "TLS" : "Off", color: report.https ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20" : "from-rose-500/20 to-rose-500/5 border-rose-500/20" },
                  { label: "IPv6", value: report.ipv6 ? "Active" : "Off", color: report.ipv6 ? "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20" : "from-zinc-500/10 to-zinc-500/5 border-[var(--border)]" },
                ].map(stat => (
                  <div key={stat.label} className={cn("rounded-xl border p-3 bg-gradient-to-br", stat.color)}>
                    <p className="text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">{stat.label}</p>
                    <p className="text-sm font-semibold truncate">{stat.value}</p>
                  </div>
                ))}
              </motion.div>

              {/* Expandable details */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] px-1">Full report</p>

                {webRTC && (
                  <Section title="WebRTC details" summary={`${webRTC.status} · ${webRTC.publicIPs.length} public IP(s)`} defaultOpen={webRTC.status === "Leak"}>
                    <MetricRow label="Status" value={webRTC.status} />
                    <MetricRow label="Public IPs" value={webRTC.publicIPs.join(", ") || "None"} mono />
                    <MetricRow label="Local IPv4" value={webRTC.localIPv4.join(", ") || "None"} mono />
                    <MetricRow label="Local IPv6" value={webRTC.localIPv6.join(", ") || "None"} mono />
                    <MetricRow label="mDNS masking" value={webRTC.mdnsEnabled ? "Active" : "Inactive"} />
                    <MetricRow label="CGNAT" value={webRTC.cgnat ? "Detected" : "No"} />
                  </Section>
                )}

                <Section title="Connection" summary={`${report.isp} · ${report.asn_type || "Network"}`}>
                  <MetricRow label="Organization" value={report.organization} />
                  <MetricRow label="ASN" value={report.asn ? String(report.asn) : "—"} mono />
                  <MetricRow label="Reverse DNS" value={report.reverse_dns || report.hostname} mono />
                  <MetricRow label="Connection type" value={report.connection_type || "—"} />
                </Section>

                <Section title="Privacy" summary={`VPN ${report.vpn ? "on" : "off"} · DNS ${report.dns_leak}`}>
                  <MetricRow label="VPN" value={report.vpn ? "Yes" : "No"} />
                  <MetricRow label="Proxy" value={report.proxy ? "Yes" : "No"} />
                  <MetricRow label="Tor" value={report.tor ? "Yes" : "No"} />
                  <MetricRow label="DNS leak" value={report.dns_leak || "—"} />
                  <MetricRow label="Risk score" value={`${report.risk_score}%`} />
                </Section>

                <Section title="Browser & device" summary={browser ? `${browser.name} · ${browser.os}` : undefined}>
                  <MetricRow label="Browser" value={report.browser || browser?.name || "—"} />
                  <MetricRow label="OS" value={report.operating_system || browser?.os || "—"} />
                  <MetricRow label="Platform" value={browser?.platform || "—"} />
                  <MetricRow label="Screen" value={browser?.screen || "—"} />
                  <MetricRow label="Language" value={browser?.language || "—"} />
                </Section>

                {fingerprint && (
                  <Section title="Fingerprint" summary={`Canvas · WebGL · ${fingerprint.fonts.length} fonts`}>
                    <MetricRow label="Canvas" value={fingerprint.canvas} mono />
                    <MetricRow label="WebGL" value={fingerprint.webglRenderer} />
                    <MetricRow label="Audio" value={fingerprint.audio} mono />
                  </Section>
                )}

                <Section title="Encryption" summary={report.https ? "Secured" : "Not secured"}>
                  <MetricRow label="HTTPS" value={report.https ? "Yes" : "No"} />
                  <MetricRow label="TLS" value={report.tls_version || "—"} />
                  <MetricRow label="HSTS" value={report.hsts ? "Yes" : "No"} />
                  <MetricRow label="Certificate" value={report.cert_issuer || "—"} />
                </Section>

                {Object.keys(services).length > 0 && (
                  <Section title="Services" summary="Reachability check">
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
              <a href={branding.documentation_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-[var(--fg)] transition-colors">
                Docs <ArrowUpRight className="size-3" />
              </a>
            )}
            {branding.github_url && (
              <a href={branding.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-[var(--fg)] transition-colors">
                GitHub <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
