"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  Globe,
  Home as HomeIcon,
  Moon,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from "lucide-react"
import { collectClientDiagnostics } from "@/lib/diagnostics"
import { WebsiteExposurePanel } from "@/components/website-exposure-panel"
import {
  buildExposureItems,
  countryCodeToFlag,
  isDnsLeak,
  isDnsSafe,
  resolveWebRTCStatus,
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

type PillTone = "ok" | "warn" | "bad" | "neutral"

function Pill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
        tone === "ok" && "border-emerald-500/25 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5",
        tone === "warn" && "border-amber-500/25 text-amber-700 dark:text-amber-400 bg-amber-500/5",
        tone === "bad" && "border-rose-500/25 text-rose-700 dark:text-rose-400 bg-rose-500/5",
        tone === "neutral" && "border-[var(--border)] text-[var(--muted)]",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "ok" && "bg-emerald-500",
          tone === "warn" && "bg-amber-500",
          tone === "bad" && "bg-rose-500",
          tone === "neutral" && "bg-zinc-400",
        )}
      />
      {label}
    </span>
  )
}

function Expand({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
      >
        <ChevronDown className={cn("size-4 text-[var(--muted)] shrink-0 transition-transform", open && "rotate-180")} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">{title}</p>
          {subtitle && <p className="text-[12px] text-[var(--muted)] mt-0.5 truncate">{subtitle}</p>}
        </div>
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
            <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-[12px] text-[var(--muted)] shrink-0">{label}</span>
      <span className={cn("text-[12px] text-right truncate", mono && "font-mono text-[11px]")}>{value || "—"}</span>
    </div>
  )
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
      if (!res.ok) throw new Error("failed")
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

  const copyIP = () => {
    if (!report?.ip) return
    navigator.clipboard.writeText(report.ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const flag = countryCodeToFlag(report?.country_code)
  const locationLine = [report?.city, report?.region].filter(Boolean).join(", ")

  const webrtcPill: { label: string; tone: PillTone } =
    webrtcStatus === "Safe" ? { label: "WebRTC secure", tone: "ok" }
    : webrtcStatus === "Leak" ? { label: "WebRTC leak", tone: "bad" }
    : webrtcStatus === "Partial" ? { label: "WebRTC partial", tone: "warn" }
    : { label: "WebRTC …", tone: "neutral" }

  const dnsPill: { label: string; tone: PillTone } =
    isDnsSafe(report?.dns_leak) ? { label: "DNS safe", tone: "ok" }
    : isDnsLeak(report?.dns_leak) ? { label: "DNS leak", tone: "bad" }
    : { label: "DNS unknown", tone: "warn" }

  const routePill: { label: string; tone: PillTone } =
    report?.vpn || report?.tor ? { label: report.tor ? "Tor" : "VPN", tone: "ok" }
    : report?.proxy ? { label: "Proxy", tone: "warn" }
    : { label: "Direct IP", tone: "bad" }

  // Check variables for VPN and Residential
  const isVpnDetected = report ? (report.vpn || report.proxy || report.tor) : false
  const isResidential = report ? report.residential : false

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-lg px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold tracking-tight">{branding.name}</span>
          </div>
          <div className="flex gap-0.5">
            <button type="button" onClick={runAnalysis} disabled={loading} className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-40" aria-label="Refresh">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <button type="button" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--fg)]" aria-label="Theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-5 py-8">
        <AnimatePresence mode="wait">
          {loading && !report ? (
            <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-32 text-center">
              <div className="size-6 border-2 border-[var(--border)] border-t-[var(--fg)] rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[var(--muted)] mt-4">Scanning connection…</p>
            </motion.div>
          ) : error ? (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center space-y-3">
              <p className="font-medium">Scan failed</p>
              <p className="text-sm text-[var(--muted)]">{error}</p>
              <button type="button" onClick={runAnalysis} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)]">Retry</button>
            </motion.div>
          ) : report ? (
            <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* 1. TOP PREMIUM IDENTITY CERTIFICATE (EXPLAINER HERO) */}
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Connection Status</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold tracking-tight">{report.score}</span>
                    <span className="text-[10px] text-[var(--muted)]">Score</span>
                  </div>
                </div>

                {/* Country Flag & Country Big Block */}
                <div className="flex gap-4 items-center">
                  <span className="text-5xl leading-none select-none" role="img" aria-label={report.country}>{flag}</span>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-semibold">Your Location</span>
                    <h1 className="text-xl font-bold tracking-tight truncate mt-0.5">{report.country || "Unknown Location"}</h1>
                    <p className="text-[12px] text-[var(--muted)] truncate mt-0.5">{locationLine || "City not detected"}</p>
                  </div>
                </div>

                {/* IP address Block */}
                <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-2xl border border-[var(--border)] p-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">Public IP Address</span>
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <span className="font-mono text-base font-semibold truncate tracking-tight">{report.ip}</span>
                    <button
                      type="button"
                      onClick={copyIP}
                      className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all shrink-0"
                      aria-label="Copy IP"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  {copied && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Copied to clipboard!</p>}
                </div>

                {/* VPN DETECTION CARD & RESIDENTIAL CARD (PRIORITY ITEMS) */}
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  {/* VPN Check */}
                  <div className={cn(
                    "rounded-2xl border p-4 space-y-1.5 flex flex-col justify-between",
                    isVpnDetected
                      ? "border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-800 dark:text-emerald-400"
                      : "border-rose-500/25 bg-rose-500/[0.02] text-rose-800 dark:text-rose-400"
                  )}>
                    <div className="flex items-center gap-2">
                      {isVpnDetected ? (
                        <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="size-4 shrink-0 text-rose-500" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">VPN Verification</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {isVpnDetected ? "VPN Detected" : "Direct / Exposed"}
                      </p>
                      <p className="text-[11px] text-[var(--muted)] mt-1 leading-snug">
                        {isVpnDetected
                          ? "Your network route is encrypted and masked."
                          : "No active tunnel. Your direct home provider is visible."}
                      </p>
                    </div>
                  </div>

                  {/* Trust Level & Residential check */}
                  <div className={cn(
                    "rounded-2xl border p-4 space-y-1.5 flex flex-col justify-between",
                    isResidential
                      ? "border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-800 dark:text-emerald-400"
                      : "border-amber-500/20 bg-amber-500/[0.02] text-amber-800 dark:text-amber-400"
                  )}>
                    <div className="flex items-center gap-2">
                      {isResidential ? (
                        <HomeIcon className="size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Server className="size-4 shrink-0 text-amber-500" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Trust Integrity</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {isResidential ? "Residential IP" : "Hosting / Server"}
                      </p>
                      <p className="text-[11px] text-[var(--muted)] mt-1 leading-snug">
                        {isResidential
                          ? "High Trust IP. Mimics a natural home network user."
                          : "Low Trust. Server/datacenter IP — flagged by secure platforms."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summaries */}
                <div className="pt-3 border-t border-[var(--border)] text-[12px] text-[var(--muted)] leading-relaxed">
                  <p className="font-medium text-[var(--fg)]">{report.status}</p>
                  <p className="mt-1">{report.summary}</p>
                  <p className="text-[11px] mt-2 truncate font-mono">{report.isp}{report.organization ? ` · ${report.organization}` : ""}</p>
                </div>
              </div>

              {/* 2. HOW WEBSITES SEE YOU (CASUAL EXPOSURE SUMMARY PANEL) */}
              <WebsiteExposurePanel
                report={report}
                browser={browser}
                webRTC={webRTC}
                webrtcStatus={webrtcStatus}
                exposureItems={exposureItems}
                countryCode={report.country_code}
              />

              {/* 3. COLLAPSIBLE ACCORDIONS FOR TECH USERS */}
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] px-1 pt-3">Advanced Audit</p>

              <Expand title="Connection Route" subtitle={`${report.isp || "—"} · ${report.asn_type || "Network"}`}>
                <div className="pt-2">
                  <Row label="Country code" value={report.country_code?.toUpperCase() || "—"} mono />
                  <Row label="Timezone" value={report.timezone} />
                  <Row label="ASN" value={report.asn ? `AS${report.asn}` : "—"} mono />
                  <Row label="Reverse DNS" value={report.reverse_dns || report.hostname} mono />
                  <Row label="IPv6" value={report.ipv6 ? "Active" : "Inactive"} />
                  <Row label="Network type" value={report.residential ? "Residential" : report.datacenter ? "Datacenter" : "Unknown"} />
                </div>
              </Expand>

              <Expand
                title="Privacy Flags"
                subtitle={`WebRTC ${webrtcStatus} · DNS ${report.dns_leak || "unknown"}`}
                defaultOpen={webrtcStatus === "Leak" || isDnsLeak(report.dns_leak)}
              >
                <div className="pt-2">
                  <Row label="WebRTC Status" value={webrtcStatus} />
                  <Row label="DNS Leak Status" value={report.dns_leak || "Unknown"} />
                  <Row label="VPN Identified" value={report.vpn ? "Yes" : "No"} />
                  <Row label="Proxy Identified" value={report.proxy ? "Yes" : "No"} />
                  <Row label="Tor Exit Node" value={report.tor ? "Yes" : "No"} />
                  <Row label="Threat Score" value={`${report.risk_score}%`} />
                  {webRTC && (
                    <>
                      <Row label="WebRTC public IPs" value={webRTC.publicIPs.join(", ") || "None"} mono />
                      <Row label="Local IPs" value={webRTC.localIPv4.concat(webRTC.localIPv6).join(", ") || "None"} mono />
                    </>
                  )}
                </div>
              </Expand>

              <Expand title="Browser Fingerprint" subtitle={`${report.browser || browser?.name || "—"} · ${report.operating_system || browser?.os || "—"}`}>
                <div className="pt-2">
                  <Row label="Browser" value={report.browser || browser?.name || "—"} />
                  <Row label="Version" value={report.browser_version || browser?.version || "—"} />
                  <Row label="OS" value={report.operating_system || browser?.os || "—"} />
                  <Row label="Language" value={report.language || browser?.language || "—"} />
                  <Row label="Screen Size" value={browser?.screen || "—"} />
                  <Row label="HTTPS Protocol" value={report.https ? report.tls_version || "Yes" : "No"} />
                  <Row label="HSTS Security" value={report.hsts ? "Yes" : "No"} />
                </div>
              </Expand>

              {(fingerprint || Object.keys(services).length > 0) && (
                <Expand title="Advanced Signals" subtitle="Canvas, WebGL & service accessibility">
                  <div className="pt-2">
                    {fingerprint && (
                      <>
                        <Row label="Canvas ID" value={fingerprint.canvas} mono />
                        <Row label="WebGL Vendor" value={fingerprint.webglVendor} />
                        <Row label="WebGL Renderer" value={fingerprint.webglRenderer} />
                        <Row label="Audio Fingerprint" value={fingerprint.audio} mono />
                      </>
                    )}
                    {Object.entries(services).map(([name, status]) => (
                      <Row key={name} label={name} value={status} />
                    ))}
                  </div>
                </Expand>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[var(--border)] mt-auto bg-[var(--surface)]">
        <div className="mx-auto max-w-lg px-5 py-5 flex justify-between text-[11px] text-[var(--muted)]">
          <span>© {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
          <div className="flex gap-3">
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
