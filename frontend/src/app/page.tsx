"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  Eye,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  AlertTriangle,
  Globe,
  Lock,
  Check,
  X,
  Activity,
  Cpu,
  Fingerprint,
} from "lucide-react"
import { collectClientDiagnostics } from "@/lib/diagnostics"
import {
  buildExposureItems,
  countryCodeToFlag,
  exposureLevelMeta,
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

// Highly compatible, ultra-smooth hover-glow card
function InteractiveCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("transition-all duration-300 hover:shadow-[0_15px_40px_rgba(99,102,241,0.08)]", className)}
    >
      {children}
    </motion.div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | number | boolean | null
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm border-b border-white/[0.05] last:border-0 hover:bg-white/[0.01] px-1 transition-colors rounded-sm">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className={cn("text-slate-200 text-right truncate max-w-[220px]", mono && "font-mono text-xs text-indigo-400 bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-500/10")}>
        {value === true ? "ACTIVE" : value === false ? "DISABLED" : (value ?? "—")}
      </span>
    </div>
  )
}

function Expand({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/70 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-white/[0.1] hover:shadow-lg hover:shadow-indigo-500/[0.02]">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="size-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
              <Icon className="size-4 text-indigo-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-slate-500 shrink-0 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.06] bg-black/20">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
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
      await new Promise(r => setTimeout(r, 450))
      
      setScanLogs(prev => prev.map(l => l.id === "dns" ? { ...l, status: "done" } : l.id === "fp" ? { ...l, status: "running" } : l))
      await new Promise(r => setTimeout(r, 450))
      
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

  const isVpnDetected = report ? (report.vpn || report.proxy || report.tor) : false
  const isResidential = report ? report.residential : false

  // Security Verdict Helper with Neon palettes
  const verdictInfo = useMemo(() => {
    if (!report) return { text: "Unknown", color: "text-zinc-400", bg: "bg-zinc-500/5", border: "border-zinc-500/20", stroke: "#71717a", glow: "rgba(113, 113, 122, 0.15)", shadow: "shadow-zinc-500/5" }
    const score = report?.score ?? 0
    if (score >= 80) {
      return {
        text: "SECURE IDENTITY",
        desc: "Your connection is encrypted, DNS is safe, and your IP is highly obfuscated.",
        color: "text-emerald-400",
        stroke: "#10b981",
        bg: "bg-emerald-950/10",
        border: "border-emerald-500/20",
        glow: "rgba(16, 185, 129, 0.15)",
        shadow: "shadow-emerald-500/5",
      }
    }
    if (score >= 55) {
      return {
        text: "PARTIAL EXPOSURE",
        desc: "Your connection has minor configuration gaps, such as open WebRTC candidates or clear reverse DNS.",
        color: "text-amber-400",
        stroke: "#f59e0b",
        bg: "bg-amber-950/10",
        border: "border-amber-500/20",
        glow: "rgba(245, 158, 11, 0.15)",
        shadow: "shadow-amber-500/5",
      }
    }
    return {
      text: "HIGH EXPOSURE",
      desc: "Warning: websites can see your exact home network, real location, and direct ISP routing details.",
      color: "text-rose-400",
      stroke: "#f43f5e",
      bg: "bg-rose-950/10",
      border: "border-rose-500/20",
      glow: "rgba(244, 63, 94, 0.15)",
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
    <div className="min-h-screen flex flex-col bg-[#050507] text-[#f1f5f9] selection:bg-indigo-500/30 overflow-x-hidden relative">
      
      {/* Cinematic grid & glow spots */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370c_1px,transparent_1px),linear-gradient(to_bottom,#1f29370c_1px,transparent_1px)] bg-[size:2rem_2rem] animate-grid-drift pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#050507]/85 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="size-3.5 text-indigo-400" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">{branding.name}</span>
              <span className="hidden sm:inline text-[10px] font-mono text-slate-500 ml-2">{"// SYSTEM.DIAGNOSTICS_CORE.v1"}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              <span>{loading ? "Scanning..." : "Re-Scan"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-10 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader-container"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="py-16 max-w-xl mx-auto space-y-8"
            >
              {/* Scan Center Radar */}
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative size-32">
                  <div className="absolute inset-0 rounded-full border border-indigo-500/10 shadow-[0_0_50px_rgba(99,102,241,0.05)]" />
                  <motion.div
                    className="absolute inset-0 rounded-full border border-transparent border-t-indigo-500 border-r-indigo-500"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-3 rounded-full border border-transparent border-b-cyan-400 border-l-cyan-400"
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  />
                  <div className="absolute inset-6 rounded-full bg-[#0c0c0e] border border-white/[0.05] flex items-center justify-center shadow-inner">
                    <Activity className="size-7 text-indigo-400 animate-pulse" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-base font-bold uppercase tracking-widest text-indigo-400">Diagnostic Scanner Active</h2>
                  <p className="text-xs text-slate-500">Checking interfaces, route tunnels, and leaking nodes...</p>
                </div>
              </div>

              {/* Console steps with Horizontal scanner line */}
              <div className="relative rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md p-5 font-mono text-xs text-slate-400 space-y-3 shadow-2xl overflow-hidden">
                <div className="absolute left-0 w-full h-[2px] bg-indigo-500/30 shadow-[0_0_15px_#6366f1] animate-laser pointer-events-none" />
                {scanLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3">
                    <span className={cn(
                      "size-2 rounded-full shrink-0",
                      log.status === "done" && "bg-emerald-500 shadow-[0_0_8px_#10b981]",
                      log.status === "running" && "bg-indigo-500 animate-ping",
                      log.status === "pending" && "bg-slate-700"
                    )} />
                    <span className="flex-1 truncate">{log.text}</span>
                    <span className={cn(
                      "text-[10px] uppercase font-bold",
                      log.status === "done" && "text-emerald-400",
                      log.status === "running" && "text-indigo-400",
                      log.status === "pending" && "text-slate-600"
                    )}>
                      {log.status === "done" ? "[COMPLETED]" : log.status === "running" ? "[SCANNING]" : "[WAIT]"}
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
              className="py-24 text-center space-y-6 max-w-md mx-auto"
            >
              <div className="size-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
                <AlertTriangle className="size-8 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-200">Handshake Timeout</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={runAnalysis}
                className="text-xs font-semibold px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-200 transition-colors shadow-sm"
              >
                Reconnect Diagnostic Core
              </button>
            </motion.div>
          ) : report ? (
            <motion.div
              key="dashboard-results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-8"
            >
              {/* ==================== CINEMATIC DASHBOARD GRID ==================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 1. LEFT COLUMN: PASSPORT NODE CARD (Span 5) */}
                <div className="lg:col-span-5 space-y-6">
                  <InteractiveCard className="rounded-3xl border border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                    {/* Reflective shine gradient on card overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.05] pointer-events-none" />
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(400px circle at 50% 50%, ${verdictInfo.glow}, transparent 60%)`
                      }}
                    />

                    {/* Card Header metadata */}
                    <div className="flex items-center justify-between gap-4 relative">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex size-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full size-2.5 bg-indigo-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono">CONNECTION_NODE_PASSPORT</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{report.timestamp?.slice(0, 10) || "LIVE"}</span>
                    </div>

                    {/* Oversized IP Section */}
                    <div className="space-y-1 relative pt-2">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black font-mono">NODE_RESOLVED_IP</span>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(99,102,241,0.1)] truncate">
                          {report.ip}
                        </span>
                        <button
                          type="button"
                          onClick={copyIP}
                          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all shrink-0 relative shadow-sm"
                          aria-label="Copy IP"
                        >
                          <Copy className="size-4" />
                          {copied && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] bg-emerald-500 text-white font-black uppercase tracking-wider px-2 py-1 rounded shadow-lg">
                              Copied!
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Styled Geolocation / SVG Flag (No Unicode Box Error) */}
                    <div className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-black/40 border border-white/[0.04]">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">GEOLOCATION_NODE</span>
                        <p className="text-base font-bold text-slate-200 mt-1 truncate">{report.country || "Unknown Country"}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {[report.city, report.region].filter(Boolean).join(", ") || "Unknown City"}
                        </p>
                      </div>
                      {report.country_code ? (
                        <img
                          src={`https://flagcdn.com/w160/${report.country_code?.toLowerCase() || ""}.png`}
                          alt={report.country || "Country Flag"}
                          className="h-10 w-auto object-contain rounded-lg border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.3)] shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Globe className="size-5 text-indigo-400" />
                        </div>
                      )}
                    </div>

                    {/* Giant Circular Dial of Connection Health */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-black/30 border border-white/[0.04]">
                      <div className="space-y-1.5 text-center sm:text-left min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">INTEGRITY_SCORE</span>
                        <h3 className={cn("text-xl font-black tracking-tight", verdictInfo.color)}>{verdictInfo.text}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                          {verdictInfo.desc}
                        </p>
                      </div>

                      {/* 2D Gauge Circle (Highly stable) */}
                      <div className="relative size-24 shrink-0 flex items-center justify-center bg-black/60 rounded-full border border-white/[0.06] shadow-xl">
                        <svg className="size-full -rotate-90 absolute" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                          <motion.circle
                            cx="50" cy="50" r="42"
                            fill="none" stroke={verdictInfo.stroke} strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 42}
                            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                            animate={{ strokeDashoffset: (2 * Math.PI * 42) - ((report?.score ?? 0) / 100) * (2 * Math.PI * 42) }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-black tabular-nums tracking-tighter text-white">{report?.score ?? 0}</span>
                          <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black font-mono">HEALTH</span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Security Pills (VPN & ISP Type) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={cn(
                        "rounded-2xl border p-4.5 space-y-2",
                        isVpnDetected ? "border-emerald-500/15 bg-emerald-500/[0.02]" : "border-rose-500/15 bg-rose-500/[0.02]"
                      )}>
                        <div className="flex items-center gap-2">
                          <Shield className={cn("size-4 shrink-0", isVpnDetected ? "text-emerald-400" : "text-rose-400")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">TUNNEL</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{isVpnDetected ? "Active Tunnel" : "Unmasked ISP"}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            {isVpnDetected ? "Your original connection is shielded." : "Websites can trace requests to your exact home router."}
                          </p>
                        </div>
                      </div>

                      <div className={cn(
                        "rounded-2xl border p-4.5 space-y-2",
                        isResidential ? "border-emerald-500/15 bg-emerald-500/[0.02]" : "border-amber-500/15 bg-amber-500/[0.02]"
                      )}>
                        <div className="flex items-center gap-2">
                          <Server className={cn("size-4 shrink-0", isResidential ? "text-emerald-400" : "text-amber-400")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">IP_CLASS</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{isResidential ? "Residential" : "Hosting / Server"}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            {isResidential ? "High Trust: looks like a natural home computer." : "Low Trust: flagged by custom strict firewalls."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </InteractiveCard>
                </div>

                {/* 2. RIGHT COLUMN: WEB SECURITY FOOTPRINT AUDIT HUB (Span 7) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                    
                    {/* Header Controls */}
                    <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                          <Eye className="size-4 text-indigo-400" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-slate-100">Web Tracker Diagnostics</h2>
                          <p className="text-xs text-slate-500 mt-0.5">What background diagnostic scripts harvest instantly</p>
                        </div>
                      </div>
                      
                      {/* Dashboard Mode Selector */}
                      <div className="flex rounded-lg bg-black/40 border border-white/[0.06] p-1 font-mono text-[10px] uppercase font-black shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => setViewMode("visual")}
                          className={cn("px-3 py-1.5 rounded-md transition-all duration-300", viewMode === "visual" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15" : "text-slate-400 hover:text-slate-200")}
                        >
                          Audit Screen
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("payload")}
                          className={cn("px-3 py-1.5 rounded-md transition-all duration-300", viewMode === "payload" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15" : "text-slate-400 hover:text-slate-200")}
                        >
                          Raw Payload
                        </button>
                      </div>
                    </div>

                    {/* Content Frame */}
                    <div className="p-6">
                      <AnimatePresence mode="wait">
                        {viewMode === "visual" ? (
                          <motion.div
                            key="view-visual"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                          >
                            {/* Visual Exposure Split Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left: Exposed Data Signals */}
                              <div className="rounded-2xl border border-rose-500/10 bg-rose-950/5 p-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-rose-500/[0.02] rounded-full blur-xl pointer-events-none" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-4 flex items-center gap-2 font-mono">
                                  <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
                                  Exposed Node Signals
                                </p>
                                <ul className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                                  <li className="flex gap-2.5 items-start">
                                    <span className="text-rose-400 select-none">📍</span>
                                    <span>Location pinpointed to city level: <strong className="text-slate-100 font-semibold">{[report.city, report.region].filter(Boolean).join(", ") || "Unknown City"}</strong></span>
                                  </li>
                                  <li className="flex gap-2.5 items-start">
                                    <span className="text-rose-400 select-none">🌐</span>
                                    <span>Exit IP address <strong className="text-slate-100 font-semibold font-mono">{report.ip}</strong> and ISP operator are visible</span>
                                  </li>
                                  <li className="flex gap-2.5 items-start">
                                    <span className="text-rose-400 select-none">💻</span>
                                    <span>Browser environment details identified: <strong className="text-slate-100 font-semibold">{report.browser || browser?.name}</strong> on <strong className="text-slate-100 font-semibold">{report.operating_system || browser?.os}</strong></span>
                                  </li>
                                  {webrtcStatus === "Leak" && (
                                    <li className="flex gap-2.5 items-start text-rose-400 bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/10">
                                      <span className="text-rose-400 select-none">⚠️</span>
                                      <span><strong>WebRTC Tunnel Breach:</strong> real system IP leaked past VPN layers.</span>
                                    </li>
                                  )}
                                  {isDnsLeak(report.dns_leak) && (
                                    <li className="flex gap-2.5 items-start text-rose-400 bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/10">
                                      <span className="text-rose-400 select-none">⚠️</span>
                                      <span><strong>DNS Leak Path:</strong> DNS queries bypassing the VPN gateway tunnel.</span>
                                    </li>
                                  )}
                                </ul>
                              </div>

                              {/* Right: Protected Systems */}
                              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/5 p-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2 font-mono">
                                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                  Secured Defensive Layers
                                </p>
                                <ul className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                                  {webrtcStatus === "Safe" ? (
                                    <li className="flex gap-2.5 items-start">
                                      <span className="text-emerald-400 select-none">✓</span>
                                      <span>WebRTC candidate checks passed. STUN interfaces sealed.</span>
                                    </li>
                                  ) : null}
                                  {isDnsSafe(report.dns_leak) ? (
                                    <li className="flex gap-2.5 items-start">
                                      <span className="text-emerald-400 select-none">✓</span>
                                      <span>DNS resolves routed safely within the tunnel gateway.</span>
                                    </li>
                                  ) : null}
                                  {isVpnDetected ? (
                                    <li className="flex gap-2.5 items-start">
                                      <span className="text-emerald-400 select-none">✓</span>
                                      <span>Commercial VPN active. Node traffic is encrypted.</span>
                                    </li>
                                  ) : null}
                                  {report.https ? (
                                    <li className="flex gap-2.5 items-start">
                                      <span className="text-emerald-400 select-none">✓</span>
                                      <span>Strict HTTPS and encryption protocol enforcement checked.</span>
                                    </li>
                                  ) : null}
                                  {fingerprint ? (
                                    <li className="flex gap-2.5 items-start">
                                      <span className="text-emerald-400 select-none">✓</span>
                                      <span>Hardware canvas spoof and anti-entropy tracking approved.</span>
                                    </li>
                                  ) : null}
                                </ul>
                              </div>
                            </div>

                            {/* Flat Details breakdown (Bigger Fonts & Cleaner Rows) */}
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1 font-mono">SIGNAL_REGISTRY_CONFIDENCE</p>
                              <div className="rounded-2xl border border-white/[0.05] bg-black/30 p-5 divide-y divide-white/[0.04]">
                                {exposureItems.slice(0, 8).map(item => {
                                  const meta = (item?.level && exposureLevelMeta[item.level]) || { label: "Unknown", dot: "bg-zinc-500", text: "text-zinc-500" }
                                  return (
                                    <div key={item.label} className="flex justify-between items-center gap-4 py-3 text-xs first:pt-0 last:pb-0 hover:bg-white/[0.01] px-1 rounded transition-colors">
                                      <div className="min-w-0">
                                        <span className="text-slate-400 font-semibold">{item.label}</span>
                                        <p className="text-[10px] text-slate-600 truncate hidden sm:block mt-0.5">{item.hint}</p>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-mono text-slate-200 truncate bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.04] text-[11px] max-w-[150px] sm:max-w-[200px]">{item.value}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className={cn("size-2 rounded-full", meta.dot)} />
                                          <span className={cn("text-[9px] uppercase font-bold tracking-wider hidden md:inline", meta.text)}>{meta.label}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="view-payload"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.25 }}
                            className="font-mono text-xs leading-relaxed text-indigo-300 p-5 rounded-2xl bg-black border border-white/[0.06] overflow-x-auto max-h-[400px] select-text relative shadow-inner"
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
                </div>
              </div>

              {/* ==================== 3. THREAT REMEDIATION ACTION PLAN ==================== */}
              {recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-3xl border border-rose-500/15 bg-rose-950/[0.03] p-6 space-y-4 shadow-xl shadow-rose-950/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-rose-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <ShieldAlert className="size-4.5 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 font-mono">Node Threat Mitigation Action Plan</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Critical operations to isolate your system and block online trackers</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl bg-black/30 border border-rose-500/[0.06] hover:border-rose-500/15 transition-all">
                        <span className="text-rose-500 font-black font-mono text-base">0{i + 1}.</span>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-200 text-xs">{rec.text}</p>
                          <p className="text-slate-400 text-xs leading-relaxed">{rec.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ==================== 4. EXPANDABLE ADVANCED DIAGNOSTICS (Frosted Glass Folders) ==================== */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono">ADVANCED_DIAGNOSTIC_DATALINKS</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Connection Accordion */}
                  <Expand 
                    title="ISP Node Routing Network" 
                    subtitle={`${report.isp || "—"} · ${report.asn_type || "Network Backbone"}`}
                    icon={Globe}
                  >
                    <div className="space-y-1">
                      <Row label="ISP Gateway Operator" value={report.isp} />
                      <Row label="Autonomous Organization" value={report.organization} />
                      <Row label="ASN Identifier" value={report.asn ? `AS${report.asn}` : "—"} mono />
                      <Row label="Reverse DNS Pointer" value={report.reverse_dns || report.hostname} mono />
                      <Row label="IPv6 Routing Protocol" value={report.ipv6 ? "Active Node" : "Loopback / Disabled"} />
                      <Row label="Node Allocation Class" value={report.residential ? "Residential Class (A)" : report.datacenter ? "Server Datacenter Class (S)" : "Broadband"} />
                    </div>
                  </Expand>

                  {/* WebRTC / DNS Leak details */}
                  <Expand
                    title="Tunnel Gateways & Leaks"
                    subtitle={`WebRTC candidate state: ${webrtcStatus} · DNS resolving: ${report.dns_leak || "Protected"}`}
                    icon={Shield}
                    defaultOpen={webrtcStatus === "Leak" || isDnsLeak(report.dns_leak)}
                  >
                    <div className="space-y-1">
                      <Row label="WebRTC Local Leak Status" value={webrtcStatus} />
                      <Row label="DNS Resolver Leak Status" value={report.dns_leak || "Safe Resolution"} />
                      <Row label="Commercial VPN Registry" value={report.vpn ? "Identified (VPN Server)" : "Direct (Unmasked)"} />
                      <Row label="Proxy Server Routing" value={report.proxy ? "Proxy Address Identified" : "Direct Connection"} />
                      <Row label="Tor Onion Router Node" value={report.tor ? "Tor Exit Node Active" : "No Onion Routing"} />
                      <Row label="Fraud/Risk Core Flag" value={`${report.risk_score}% Threat Level`} />
                      {webRTC && (
                        <>
                          <Row label="Exposed Local WebRTC IPs" value={webRTC.localIPv4.concat(webRTC.localIPv6).join(", ") || "No Local Leak"} mono />
                          <Row label="Exposed STUN Candidates" value={webRTC.publicIPs.join(", ") || "No STUN Exposure"} mono />
                        </>
                      )}
                    </div>
                  </Expand>

                  {/* Browser Device specs */}
                  <Expand 
                    title="Agent Node & Environment" 
                    subtitle={`${report.browser || browser?.name || "—"} · ${report.operating_system || browser?.os || "—"}`}
                    icon={Cpu}
                  >
                    <div className="space-y-1">
                      <Row label="Target Operating System" value={report.operating_system || browser?.os || "—"} />
                      <Row label="User Agent Software" value={report.browser || browser?.name || "—"} />
                      <Row label="Browser Frame Version" value={report.browser_version || browser?.version || "—"} />
                      <Row label="Active Localization Profile" value={browser?.language || "—"} />
                      <Row label="Display Screen Geometry" value={browser?.screen || "—"} />
                      <Row label="SSL/TLS Security Tunnel" value={report.https ? `Encrypted (${report.tls_version || "TLS 1.3"})` : "Plaintext HTTP"} />
                      <Row label="HSTS Security Rule" value={report.hsts ? "Strict Secure Policy" : "Inactive"} />
                    </div>
                  </Expand>

                  {/* Advanced Entropy Checks */}
                  {(fingerprint || Object.keys(services).length > 0) && (
                    <Expand 
                      title="Entropy Hardware Fingerprint" 
                      subtitle="Unique silicon-canvas signatures & service accessibility"
                      icon={Fingerprint}
                    >
                      <div className="space-y-1">
                        {fingerprint && (
                          <>
                            <Row label="HTML Canvas Identifier" value={fingerprint.canvas} mono />
                            <Row label="WebGL Microchip Vendor" value={fingerprint.webglVendor} />
                            <Row label="WebGL Hardware Driver" value={fingerprint.webglRenderer} />
                            <Row label="Audio Interface Spectrum" value={fingerprint.audio} mono />
                          </>
                        )}
                        {Object.entries(services).map(([name, status]) => (
                          <Row key={name} label={`Service Path // ${name}`} value={status} />
                        ))}
                      </div>
                    </Expand>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/[0.05] mt-auto bg-[#070709]">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} {branding.copyright_text || branding.name} {"// SECURE ENCRYPTED NODE"}</span>
          <div className="flex gap-4">
            {branding.github_url && (
              <a href={branding.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-slate-200 transition-colors">
                GitHub Repository <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
