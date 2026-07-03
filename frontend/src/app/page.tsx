"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  Moon,
  RefreshCw,
  Sun,
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

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn("inline-block size-1.5 rounded-full shrink-0", ok ? "bg-emerald-500" : "bg-amber-500")} />
  )
}

function MetricRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3 border-b border-[var(--border)] last:border-0">
      <span className="text-[13px] text-[var(--muted)]">{label}</span>
      <span className={cn("text-[13px] text-right truncate max-w-[60%]", mono && "font-mono text-[12px]")}>
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
    <div className="border border-[var(--border)] rounded-xl bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{title}</p>
          {summary && !open && (
            <p className="text-[12px] text-[var(--muted)] mt-0.5 truncate">{summary}</p>
          )}
        </div>
        <ChevronDown className={cn("size-4 text-[var(--muted)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-0 border-t border-[var(--border)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 65) return "Good"
  if (score >= 45) return "Fair"
  return "Poor"
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 65) return "text-zinc-900 dark:text-zinc-100"
  if (score >= 45) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
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
      const client = await collectClientDiagnostics(
        data.ip,
        data.vpn || data.proxy || data.tor,
      )
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

  const location = [report?.city, report?.country].filter(Boolean).join(", ") || "—"
  const tunnelLabel = report?.vpn ? "VPN" : report?.proxy ? "Proxy" : report?.tor ? "Tor" : "Direct"
  const isProtected = report?.vpn || report?.proxy || report?.tor

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center justify-between">
          <span className="text-[13px] font-medium tracking-tight">{branding.name}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-12">
        <AnimatePresence mode="wait">
          {loading && !report ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-4"
            >
              <div className="size-5 border-2 border-[var(--border)] border-t-[var(--fg)] rounded-full animate-spin" />
              <p className="text-[13px] text-[var(--muted)]">Analyzing connection…</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-4 text-center"
            >
              <p className="text-[15px] font-medium">Something went wrong</p>
              <p className="text-[13px] text-[var(--muted)] max-w-xs">{error}</p>
              <button
                type="button"
                onClick={runAnalysis}
                className="mt-2 text-[13px] font-medium px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
              >
                Try again
              </button>
            </motion.div>
          ) : report ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-10"
            >
              {/* Hero score */}
              <section className="text-center space-y-3">
                <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--muted)]">Privacy score</p>
                <div className="flex items-end justify-center gap-1">
                  <span className={cn("text-7xl font-light tabular-nums tracking-tight", scoreColor(report.score))}>
                    {report.score}
                  </span>
                  <span className="text-[15px] text-[var(--muted)] pb-3">/100</span>
                </div>
                <p className="text-[13px] text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
                  {scoreLabel(report.score)} · {report.summary || "Connection analysis complete."}
                </p>
              </section>

              {/* Primary card */}
              <section className="border border-[var(--border)] rounded-2xl bg-[var(--surface)] p-6 space-y-1">
                <div className="flex items-start justify-between gap-4 pb-4 mb-2 border-b border-[var(--border)]">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1">Public IP</p>
                    <p className="font-mono text-[15px] tracking-tight truncate">{report.ip}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyIP}
                    className="p-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] transition-colors shrink-0"
                    aria-label="Copy IP"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                {copied && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 -mt-2 mb-2">Copied</p>}

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-2">
                  <div>
                    <p className="text-[11px] text-[var(--muted)] mb-1">Location</p>
                    <p className="text-[13px] flex items-center gap-2">
                      {flagUrl && (
                        <img src={flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover shrink-0" />
                      )}
                      {location}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--muted)] mb-1">Network</p>
                    <p className="text-[13px] truncate">{report.isp || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--muted)] mb-1">Tunnel</p>
                    <p className="text-[13px] flex items-center gap-2">
                      <StatusDot ok={!!isProtected} />
                      {tunnelLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--muted)] mb-1">Reputation</p>
                    <p className="text-[13px] flex items-center gap-2">
                      <StatusDot ok={report.risk_score < 30} />
                      {report.risk_score < 30 ? "Clean" : "Flagged"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Status strip */}
              <section className="flex flex-wrap gap-2">
                {[
                  { label: "DNS", ok: report.dns_leak === "No Leak" },
                  { label: "WebRTC", ok: webRTC?.status === "Safe" },
                  { label: "IPv6", ok: report.ipv6 },
                  { label: "HTTPS", ok: report.https },
                  { label: "Residential", ok: report.residential },
                ].map(item => (
                  <span
                    key={item.label}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border",
                      item.ok
                        ? "border-emerald-500/20 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                        : "border-[var(--border)] text-[var(--muted)] bg-[var(--surface)]",
                    )}
                  >
                    <StatusDot ok={item.ok} />
                    {item.label}
                  </span>
                ))}
              </section>

              {/* Detail sections */}
              <section className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] px-1">Details</p>

                <Section
                  title="Connection"
                  summary={`${report.browser || browser?.name || "—"} · ${report.operating_system || browser?.os || "—"}`}
                >
                  <MetricRow label="ISP" value={report.isp} />
                  <MetricRow label="Organization" value={report.organization} />
                  <MetricRow label="ASN" value={report.asn ? String(report.asn) : "—"} mono />
                  <MetricRow label="Type" value={report.asn_type || (report.residential ? "Residential" : "Datacenter")} />
                  <MetricRow label="Reverse DNS" value={report.reverse_dns || report.hostname} mono />
                  <MetricRow label="Timezone" value={report.timezone} />
                </Section>

                <Section
                  title="Privacy & security"
                  summary={isProtected ? "Tunnel detected" : "Direct connection"}
                >
                  <MetricRow label="VPN" value={report.vpn ? "Yes" : "No"} />
                  <MetricRow label="Proxy" value={report.proxy ? "Yes" : "No"} />
                  <MetricRow label="Tor" value={report.tor ? "Yes" : "No"} />
                  <MetricRow label="Datacenter" value={report.datacenter ? "Yes" : "No"} />
                  <MetricRow label="DNS leak" value={report.dns_leak || "—"} />
                  <MetricRow label="Risk score" value={`${report.risk_score}%`} />
                </Section>

                <Section
                  title="Browser"
                  summary={browser ? `${browser.name} on ${browser.os}` : undefined}
                >
                  <MetricRow label="Browser" value={report.browser || browser?.name || "—"} />
                  <MetricRow label="Version" value={report.browser_version || browser?.version || "—"} />
                  <MetricRow label="OS" value={report.operating_system || browser?.os || "—"} />
                  <MetricRow label="Platform" value={report.platform || browser?.platform || "—"} />
                  <MetricRow label="Language" value={report.language || browser?.language || "—"} />
                  <MetricRow label="Screen" value={browser?.screen || "—"} />
                </Section>

                {webRTC && (
                  <Section title="WebRTC" summary={`Status: ${webRTC.status}`}>
                    <MetricRow label="Status" value={webRTC.status} />
                    <MetricRow label="Public IPs" value={webRTC.publicIPs.join(", ") || "None"} mono />
                    <MetricRow label="Local IPv4" value={webRTC.localIPv4.join(", ") || "None"} mono />
                    <MetricRow label="mDNS" value={webRTC.mdnsEnabled ? "Enabled" : "Disabled"} />
                    <MetricRow label="CGNAT" value={webRTC.cgnat ? "Detected" : "No"} />
                  </Section>
                )}

                {fingerprint && (
                  <Section title="Fingerprint" summary="Canvas, WebGL, audio">
                    <MetricRow label="Canvas" value={fingerprint.canvas} mono />
                    <MetricRow label="WebGL vendor" value={fingerprint.webglVendor} />
                    <MetricRow label="WebGL renderer" value={fingerprint.webglRenderer} />
                    <MetricRow label="Audio" value={fingerprint.audio} mono />
                    <MetricRow label="Fonts detected" value={String(fingerprint.fonts.length)} />
                  </Section>
                )}

                <Section title="Encryption" summary={report.https ? report.tls_version || "TLS" : "Not secure"}>
                  <MetricRow label="HTTPS" value={report.https ? "Yes" : "No"} />
                  <MetricRow label="TLS" value={report.tls_version || "—"} />
                  <MetricRow label="HTTP version" value={report.http_version || "—"} />
                  <MetricRow label="HSTS" value={report.hsts ? "Yes" : "No"} />
                  <MetricRow label="Certificate" value={report.cert_issuer || "—"} />
                </Section>

                {Object.keys(services).length > 0 && (
                  <Section title="Service reachability" summary="External connectivity">
                    {Object.entries(services).map(([name, status]) => (
                      <MetricRow key={name} label={name} value={status} />
                    ))}
                  </Section>
                )}
              </section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-auto">
        <div className="mx-auto max-w-2xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
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
