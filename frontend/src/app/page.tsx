"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Copy,
  Cpu,
  Database,
  Eye,
  FileCode,
  Globe,
  Info,
  Laptop,
  Lock,
  Moon,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Terminal,
  User,
  Wifi,
  AlertTriangle,
} from "lucide-react"
import { collectClientDiagnostics } from "@/lib/diagnostics"
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

type ScanLog = {
  id: string
  text: string
  status: "pending" | "running" | "done"
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
  const [viewMode, setViewMode] = useState<"visual" | "payload">("visual")

  // Animated loading logs state
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([
    { id: "geo", text: "Querying GeoIP reputation registry...", status: "pending" },
    { id: "webrtc", text: "Scanning ICE candidates & STUN interfaces...", status: "pending" },
    { id: "dns", text: "Testing DNS leak paths & resolver trust...", status: "pending" },
    { id: "fp", text: "Evaluating high-entropy browser fingerprint...", status: "pending" },
  ])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    fetch("/api/branding").then(r => r.ok ? r.json() : null).then(d => { if (d) setBranding(d) }).catch(() => {})
  }, [])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError("")
    
    // Reset and step through logs
    setScanLogs([
      { id: "geo", text: "Querying GeoIP reputation registry...", status: "running" },
      { id: "webrtc", text: "Scanning ICE candidates & STUN interfaces...", status: "pending" },
      { id: "dns", text: "Testing DNS leak paths & resolver trust...", status: "pending" },
      { id: "fp", text: "Evaluating high-entropy browser fingerprint...", status: "pending" },
    ])

    try {
      const res = await fetch("/api/check")
      if (!res.ok) throw new Error("failed")
      const data = (await res.json()) as ConnectionReport
      
      setScanLogs(prev => prev.map(l => l.id === "geo" ? { ...l, status: "done" } : l.id === "webrtc" ? { ...l, status: "running" } : l))

      const client = await collectClientDiagnostics(data.ip, data.vpn || data.proxy || data.tor)
      
      setScanLogs(prev => prev.map(l => l.id === "webrtc" ? { ...l, status: "done" } : l.id === "dns" ? { ...l, status: "running" } : l))
      await new Promise(r => setTimeout(r, 400))
      
      setScanLogs(prev => prev.map(l => l.id === "dns" ? { ...l, status: "done" } : l.id === "fp" ? { ...l, status: "running" } : l))
      await new Promise(r => setTimeout(r, 400))
      
      setFingerprint(client.fingerprint)
      setWebRTC(client.webRTC)
      setBrowser(client.browser)
      setServices(client.services)
      setReport(data)

      setScanLogs(prev => prev.map(l => l.id === "fp" ? { ...l, status: "done" } : l))
    } catch {
      setError("Could not establish server diagnostic handshake.")
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

  const isVpnDetected = report ? (report.vpn || report.proxy || report.tor) : false
  const isResidential = report ? report.residential : false

  // Security Verdict helper
  const verdictInfo = useMemo(() => {
    if (!report) return { text: "Unknown", color: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20" }
    const score = report.score
    if (score >= 80) {
      return {
        text: "SECURE IDENTITY",
        desc: "Your connection is encrypted, DNS is safe, and your IP is highly obfuscated.",
        color: "text-emerald-500 dark:text-emerald-400",
        stroke: "#10b981",
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20",
        shadow: "shadow-emerald-500/5",
      }
    }
    if (score >= 55) {
      return {
        text: "PARTIAL EXPOSURE",
        desc: "Your connection has minor configuration gaps, such as open WebRTC candidates or clear reverse DNS.",
        color: "text-amber-500 dark:text-amber-400",
        stroke: "#f59e0b",
        bg: "bg-amber-500/5",
        border: "border-amber-500/20",
        shadow: "shadow-amber-500/5",
      }
    }
    return {
      text: "HIGH EXPOSURE",
      desc: "Warning: websites can see your exact home network, real location, and direct ISP routing details.",
      color: "text-rose-500 dark:text-rose-400",
      stroke: "#f43f5e",
      bg: "bg-rose-500/5",
      border: "border-rose-500/20",
      shadow: "shadow-rose-500/5",
    }
  }, [report])

  // Simple recommendations builder
  const recommendations = useMemo(() => {
    if (!report) return []
    const items: { text: string; action: string }[] = []
    if (!isVpnDetected) {
      items.push({ text: "Your connection is directly exposed.", action: "Activate a secure VPN or Tor proxy to hide your home ISP." })
    }
    if (webrtcStatus === "Leak") {
      items.push({ text: "WebRTC is leaking your original IP.", action: "Install a WebRTC blocker extension or disable it in browser settings." })
    }
    if (isDnsLeak(report.dns_leak)) {
      items.push({ text: "DNS queries are leaking outside tunnel.", action: "Configure private/encrypted DNS servers like Cloudflare (1.1.1.1)." })
    }
    if (report.risk_score >= 40) {
      items.push({ text: "Your IP reputation is flagged.", action: "Avoid submitting forms on secure sites, or request a fresh IP route." })
    }
    return items
  }, [report, isVpnDetected, webrtcStatus])

  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-[#f1f5f9] selection:bg-indigo-500/20">
      {/* Decorative cyber grid in bg */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-radial-gradient from-indigo-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="size-3 text-indigo-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">{branding.name} // Security Core</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
              title="Re-scan Network"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-5 py-8 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader-container"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="py-16 space-y-8"
            >
              {/* Futuristic scanning animation */}
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative size-24">
                  <div className="absolute inset-0 rounded-full border border-indigo-500/10" />
                  <motion.div
                    className="absolute inset-0 rounded-full border border-transparent border-t-indigo-500"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full border border-transparent border-b-cyan-400"
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                  <div className="absolute inset-4 rounded-full bg-indigo-500/5 flex items-center justify-center">
                    <Terminal className="size-6 text-indigo-400 animate-pulse" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Diagnostic Scanner Active</h2>
                  <p className="text-xs text-slate-500">Checking interfaces, route tunnels and leaks...</p>
                </div>
              </div>

              {/* Terminal Logs check steps */}
              <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 font-mono text-[11px] text-slate-400 space-y-2">
                {scanLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3">
                    <span className={cn(
                      "size-1.5 rounded-full shrink-0",
                      log.status === "done" && "bg-emerald-500 shadow-[0_0_8px_#10b981]",
                      log.status === "running" && "bg-indigo-500 animate-ping",
                      log.status === "pending" && "bg-slate-700"
                    )} />
                    <span className="flex-1 truncate">{log.text}</span>
                    <span className={cn(
                      "text-[10px] uppercase font-bold",
                      log.status === "done" && "text-emerald-500",
                      log.status === "running" && "text-indigo-400",
                      log.status === "pending" && "text-slate-600"
                    )}>
                      {log.status === "done" ? "[OK]" : log.status === "running" ? "[SCAN]" : "[WAIT]"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error-box"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center space-y-4"
            >
              <AlertTriangle className="size-10 text-rose-500 mx-auto" />
              <p className="font-semibold">Handshake timeout</p>
              <p className="text-sm text-slate-400">{error}</p>
              <button
                type="button"
                onClick={runAnalysis}
                className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] transition-colors"
              >
                Reconnect Core
              </button>
            </motion.div>
          ) : report ? (
            <motion.div
              key="dashboard-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              {/* ==================== 1. DIAGNOSTICS AUDIT CARD (VERDICT SUMMARY) ==================== */}
              <div className={cn("rounded-3xl border p-5 space-y-5 shadow-lg", verdictInfo.border, verdictInfo.bg, verdictInfo.shadow)}>
                
                {/* Score & Verdict Title */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex size-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2.5 bg-indigo-500"></span>
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">Connection Audit Certificate</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{report.timestamp?.slice(0, 10) || "LIVE"}</span>
                </div>

                {/* Big Info Block */}
                <div className="flex items-center gap-5 justify-between">
                  <div className="min-w-0">
                    <h1 className={cn("text-2xl font-black tracking-tight", verdictInfo.color)}>{verdictInfo.text}</h1>
                    <p className="text-[12px] text-slate-400 mt-1 leading-relaxed max-w-[280px]">
                      {verdictInfo.desc}
                    </p>
                  </div>
                  {/* Circle Score representation */}
                  <div className="relative size-20 shrink-0 flex items-center justify-center bg-black/40 rounded-full border border-white/[0.06]">
                    <svg className="size-full -rotate-90 absolute" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                      <motion.circle
                        cx="50" cy="50" r="42"
                        fill="none" stroke={verdictInfo.stroke} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: (2 * Math.PI * 42) - (report.score / 100) * (2 * Math.PI * 42) }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-black tabular-nums">{report.score}</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Health</span>
                    </div>
                  </div>
                </div>

                {/* IP, Location line */}
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  {/* Public IP */}
                  <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 space-y-1 relative group">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Public IP Address</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold truncate tracking-tight text-indigo-300">{report.ip}</span>
                      <button
                        type="button"
                        onClick={copyIP}
                        className="p-1 rounded bg-white/5 text-slate-400 hover:text-slate-100 transition-colors"
                        aria-label="Copy IP"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                    {copied && <span className="absolute bottom-1 right-2 text-[8px] text-emerald-400 font-bold">Copied!</span>}
                  </div>

                  {/* Geolocation */}
                  <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Resolved Geolocation</span>
                    <p className="text-sm font-semibold truncate flex items-center gap-2">
                      <span className="text-xl leading-none select-none">{flag}</span>
                      <span className="truncate">{report.country || "Unknown Country"}</span>
                    </p>
                  </div>
                </div>

                {/* Priority Security Metrics (VPN & Trust Level) */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* VPN Detection */}
                  <div className={cn(
                    "rounded-2xl border p-4 flex flex-col justify-between min-h-[105px]",
                    isVpnDetected ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-rose-500/20 bg-rose-500/[0.02]"
                  )}>
                    <div className="flex items-center gap-2">
                      <Shield className={cn("size-4 shrink-0", isVpnDetected ? "text-emerald-500" : "text-rose-500")} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">VPN Routing</span>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-100">{isVpnDetected ? "Obfuscated (VPN/Proxy)" : "Direct (Unmasked)"}</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        {isVpnDetected ? "Your original connection ISP details are hidden." : "Sites can trace requests back to your home router."}
                      </p>
                    </div>
                  </div>

                  {/* Trust Integrity */}
                  <div className={cn(
                    "rounded-2xl border p-4 flex flex-col justify-between min-h-[105px]",
                    isResidential ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-amber-500/20 bg-amber-500/[0.02]"
                  )}>
                    <div className="flex items-center gap-2">
                      <Server className={cn("size-4 shrink-0", isResidential ? "text-emerald-500" : "text-amber-500")} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">IP Integrity</span>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-100">{isResidential ? "Residential ISP" : "Server/Datacenter"}</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        {isResidential ? "High Trust: looks like a natural, everyday user." : "Low Trust: flagged by security firewalls."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================== 2. HOW WEBSITES TRACK YOU (AUDIT DATA INTERACTIVE) ==================== */}
              <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden shadow-md">
                
                {/* Panel bar toggler */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <Eye className="size-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">How websites track you</h2>
                      <p className="text-[11px] text-slate-500">Data silent scripts grab the instant you connect</p>
                    </div>
                  </div>
                  
                  {/* View modes toggler */}
                  <div className="flex rounded-lg bg-black/40 border border-white/[0.06] p-1 font-mono text-[10px] uppercase font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode("visual")}
                      className={cn("px-2.5 py-1 rounded-md transition-all", viewMode === "visual" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
                    >
                      Audit
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("payload")}
                      className={cn("px-2.5 py-1 rounded-md transition-all", viewMode === "payload" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {/* Dynamic audit interface block */}
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {viewMode === "visual" ? (
                      <motion.div
                        key="view-visual"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 5 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Summary of signals */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          {/* Exposed signals List */}
                          <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                              Exposed Footprint
                            </p>
                            <ul className="space-y-2.5 text-[12px] leading-snug text-slate-300">
                              <li className="flex gap-2"><span>📍</span> <span>Location is visible to city level ({locationLine || "Unknown"})</span></li>
                              <li className="flex gap-2"><span>🌐</span> <span>IP ({report.ip}) and ISP are public</span></li>
                              <li className="flex gap-2"><span>💻</span> <span>Running {report.browser || browser?.name} on {report.operating_system || browser?.os}</span></li>
                              {webrtcStatus === "Leak" && <li className="flex gap-2 text-rose-400"><span>⚠️</span> <span>WebRTC leaks real IP behind proxies</span></li>}
                              {isDnsLeak(report.dns_leak) && <li className="flex gap-2 text-rose-400"><span>⚠️</span> <span>DNS Server leaks true location</span></li>}
                            </ul>
                          </div>

                          {/* Protected metrics List */}
                          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Secured Layers
                            </p>
                            <ul className="space-y-2.5 text-[12px] leading-snug text-slate-300">
                              {webrtcStatus === "Safe" && <li className="flex gap-2"><span>✓</span> <span>WebRTC STUN interface is secure</span></li>}
                              {isDnsSafe(report.dns_leak) && <li className="flex gap-2"><span>✓</span> <span>DNS queries routed safely inside tunnel</span></li>}
                              {isVpnDetected && <li className="flex gap-2"><span>✓</span> <span>IP encryption tunnel active</span></li>}
                              {report.https && <li className="flex gap-2"><span>✓</span> <span>SSL secure HTTPS protocol enforced</span></li>}
                              {fingerprint && <li className="flex gap-2"><span>✓</span> <span>Fingerprinting canvas checks passed</span></li>}
                            </ul>
                          </div>
                        </div>

                        {/* Flat quick stats details breakdown list */}
                        <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 divide-y divide-white/[0.05]">
                          {exposureItems.slice(0, 8).map(item => {
                            const meta = exposureLevelMeta[item.level]
                            return (
                              <div key={item.label} className="flex justify-between gap-3 py-2 text-[12px] first:pt-0 last:pb-0">
                                <span className="text-slate-500">{item.label}</span>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-slate-300 truncate">{item.value}</span>
                                  <span className={cn("size-1.5 rounded-full shrink-0", meta.dot)} title={meta.label} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="view-payload"
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.2 }}
                        className="font-mono text-[11px] leading-relaxed text-slate-400 p-4 rounded-2xl bg-black border border-white/[0.06] overflow-x-auto max-h-[300px] select-text"
                      >
                        <pre className="text-indigo-400">
                          {JSON.stringify(
                            {
                              connection: {
                                ip: report.ip,
                                host: report.hostname,
                                reverse_dns: report.reverse_dns,
                                ipv4: report.ipv4,
                                ipv6: report.ipv6,
                              },
                              geo: {
                                country_code: report.country_code,
                                country_name: report.country,
                                region: report.region,
                                city: report.city,
                                isp: report.isp,
                                asn: report.asn,
                                type: report.asn_type,
                              },
                              privacy: {
                                vpn: report.vpn,
                                proxy: report.proxy,
                                tor: report.tor,
                                webrtc_leak: report.webrtc_leak,
                                dns_leak: report.dns_leak,
                                risk_score: report.risk_score,
                              },
                              device: {
                                browser: report.browser || browser?.name,
                                os: report.operating_system || browser?.os,
                                language: report.language || browser?.language,
                                screen: browser?.screen,
                                user_agent: report.user_agent,
                              },
                            },
                            null,
                            2
                          )}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ==================== 3. ACTION PLAN (RECOMMENDATIONS) ==================== */}
              {recommendations.length > 0 && (
                <div className="rounded-3xl border border-rose-500/10 bg-rose-500/[0.02] p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-rose-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400">Action Plan to Secure Your Route</h3>
                  </div>
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-3 text-[12px] leading-relaxed">
                        <span className="text-rose-500 font-bold font-mono">0{i + 1}.</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200">{rec.text}</p>
                          <p className="text-slate-400 mt-0.5">{rec.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== 4. EXPANDABLE TECHNICAL DETAILS ==================== */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">Network Diagnostic details</p>

                {/* Connection Accordion */}
                <Expand title="Diagnostic Node Routing" subtitle={`${report.isp || "—"} · ${report.asn_type || "Network"}`}>
                  <div className="pt-2">
                    <Row label="ISP Route Provider" value={report.isp} />
                    <Row label="Organization" value={report.organization} />
                    <Row label="Autonomous System Number" value={report.asn ? `AS${report.asn}` : "—"} mono />
                    <Row label="Reverse DNS Resolves" value={report.reverse_dns || report.hostname} mono />
                    <Row label="IPv6 Capability" value={report.ipv6 ? "Enabled / Active" : "Disabled / Inactive"} />
                    <Row label="Network Node Classification" value={report.residential ? "Residential ISP" : report.datacenter ? "Hosting Datacenter" : "Broadband"} />
                  </div>
                </Expand>

                {/* WebRTC / DNS Leak details */}
                <Expand
                  title="Tunnel Integrity & Leak Audit"
                  subtitle={`WebRTC: ${webrtcStatus} · DNS: ${report.dns_leak || "unknown"}`}
                  defaultOpen={webrtcStatus === "Leak" || isDnsLeak(report.dns_leak)}
                >
                  <div className="pt-2">
                    <Row label="WebRTC Leak Audit" value={webrtcStatus} />
                    <Row label="DNS Leak Audit" value={report.dns_leak || "Unknown"} />
                    <Row label="Commercial VPN Flag" value={report.vpn ? "True (Masked)" : "False (Direct)"} />
                    <Row label="Tunnel Proxy Flag" value={report.proxy ? "True (Masked)" : "False (Direct)"} />
                    <Row label="Tor Exit Node Flag" value={report.tor ? "True (Masked)" : "False (Direct)"} />
                    <Row label="Global Fraud Risk Score" value={`${report.risk_score}%`} />
                    {webRTC && (
                      <>
                        <Row label="Detected Public WebRTC IPs" value={webRTC.publicIPs.join(", ") || "None"} mono />
                        <Row label="Detected Private Local IPs" value={webRTC.localIPv4.concat(webRTC.localIPv6).join(", ") || "None"} mono />
                      </>
                    )}
                  </div>
                </Expand>

                {/* Browser Device specs */}
                <Expand title="System Device Fingerprint" subtitle={`${report.browser || browser?.name || "—"} · ${report.operating_system || browser?.os || "—"}`}>
                  <div className="pt-2">
                    <Row label="Operating System Node" value={report.operating_system || browser?.os || "—"} />
                    <Row label="User Agent Descriptor" value={report.browser || browser?.name || "—"} />
                    <Row label="Browser Version" value={report.browser_version || browser?.version || "—"} />
                    <Row label="System Localization" value={browser?.language || "—"} />
                    <Row label="Physical Screen Bounds" value={browser?.screen || "—"} />
                    <Row label="Active SSL/HTTPS Tunnel" value={report.https ? `Active (${report.tls_version || "TLS 1.3"})` : "No HTTPS Encryption"} />
                    <Row label="Strict Transport Security (HSTS)" value={report.hsts ? "Strict/Active" : "Inactive"} />
                  </div>
                </Expand>

                {/* Advanced Entropy Checks */}
                {(fingerprint || Object.keys(services).length > 0) && (
                  <Expand title="High-Entropy Hardware Signals" subtitle="Canvas identifiers & service handshakes">
                    <div className="pt-2">
                      {fingerprint && (
                        <>
                          <Row label="Canvas Fingerprint Hash" value={fingerprint.canvas} mono />
                          <Row label="WebGL Chipset Vendor" value={fingerprint.webglVendor} />
                          <Row label="WebGL Hardware Renderer" value={fingerprint.webglRenderer} />
                          <Row label="Audio Interface Hash" value={fingerprint.audio} mono />
                        </>
                      )}
                      {Object.entries(services).map(([name, status]) => (
                        <Row key={name} label={name} value={status} />
                      ))}
                    </div>
                  </Expand>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/[0.06] mt-auto bg-[#0a0a0c]">
        <div className="mx-auto max-w-lg px-5 py-5 flex justify-between text-[11px] text-slate-500">
          <span>© {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
          <div className="flex gap-3">
            {branding.github_url && (
              <a href={branding.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-slate-100 transition-colors">
                GitHub <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
