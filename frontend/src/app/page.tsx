"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShieldCheck, ShieldAlert, Cpu, Network, Globe2, Sun, Moon,
  RefreshCw, AlertTriangle, CheckCircle, Compass, Info, ChevronDown, ChevronUp, CpuIcon
} from "lucide-react"

interface ConnectionReport {
  ip: string
  hostname: string
  reverse_dns: string
  connection_type: string
  ipv4: boolean
  ipv6: boolean
  country: string
  country_code: string
  country_flag: string
  region: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  organization: string
  asn: number
  browser: string
  browser_version: string
  operating_system: string
  platform: string
  language: string
  user_agent: string
  https: boolean
  http_version: string
  tls_version: string
  webrtc: boolean
  webrtc_leak: string
  dns_leak: string
  risk_score: number
  hosting: boolean
  vpn: boolean
  proxy: boolean
  tor: boolean
  anonymous: boolean
  mobile: boolean
  residential: boolean
  datacenter: boolean
  services: Record<string, boolean>
  summary: string
  score: number
  status: string
  timestamp: string
}

export default function Home() {
  const [report, setReport] = useState<ConnectionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [error, setError] = useState("")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const match = window.matchMedia("(prefers-color-scheme: dark)")
      setTheme(match.matches ? "dark" : "light")
    }
  }, [])

  const startAnalysis = async () => {
    setLoading(true)
    setProgress(15)
    setError("")
    setExpandedCard(null)
    
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 12 : prev))
    }, 250)

    try {
      const res = await fetch("/api/check")
      if (!res.ok) throw new Error("Failed to fetch diagnostics")
      const data = await res.json()
      clearInterval(timer)
      setProgress(100)
      setTimeout(() => {
        setReport(data)
        setLoading(false)
      }, 400)
    } catch (err: any) {
      clearInterval(timer)
      setError("Unable to resolve connection check. Please verify backend status.")
      setLoading(false)
    }
  }

  useEffect(() => {
    startAnalysis()
  }, [])

  const isDark = theme === "dark"

  const toggleExpand = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans relative overflow-hidden ${
      isDark 
        ? "bg-zinc-950 text-zinc-100" 
        : "bg-zinc-50/50 text-zinc-900"
    }`}>
      
      {/* Vercel-like Dot Grid Background Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(circle at 1px 1px, #27272a 1px, transparent 0)"
            : "radial-gradient(circle at 1px 1px, #d4d4d8 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Decorative ambient background glowing meshes */}
      <div className="absolute top-0 left-0 right-0 h-[650px] overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-30%] left-[20%] w-[60%] h-[70%] rounded-full blur-[180px] opacity-40 transition-all duration-1000 ${
          isDark ? "bg-violet-950/20" : "bg-violet-200/30"
        }`} />
        <div className={`absolute top-[5%] right-[20%] w-[50%] h-[60%] rounded-full blur-[160px] opacity-35 transition-all duration-1000 ${
          isDark ? "bg-indigo-950/15" : "bg-indigo-200/20"
        }`} />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col justify-between">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent">
              NEOCHECK
            </span>
          </div>

          {/* Minimalist Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle Theme"
            className={`p-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDark 
                ? "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" 
                : "bg-white/80 border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:shadow-sm"
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Core Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center py-20"
            >
              {/* Radar Scanner Ring */}
              <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full border border-dashed animate-[spin_30s_linear_infinite] ${
                  isDark ? "border-zinc-800" : "border-zinc-300"
                }`} />
                <div className={`absolute w-[80%] h-[80%] rounded-full border border-dashed animate-[spin_15s_linear_infinite] ${
                  isDark ? "border-zinc-800" : "border-zinc-300"
                }`} />
                
                {/* Radial Glow Pulse */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="absolute w-36 h-36 rounded-full bg-violet-500/10 blur-xl"
                />

                {/* Core radar center */}
                <div className={`w-28 h-28 rounded-full border flex flex-col items-center justify-center shadow-md relative ${
                  isDark ? "bg-zinc-900 border-zinc-800/80" : "bg-white border-zinc-200/80"
                }`}>
                  <Compass className="w-7 h-7 text-violet-500 animate-spin" />
                  <span className="text-[9px] font-black tracking-widest text-zinc-500 mt-2.5 uppercase">Inspecting</span>
                </div>
              </div>

              {/* Progress text */}
              <div className="text-center space-y-3">
                <h2 className="text-lg font-bold">Scanning Connection Parameters</h2>
                <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">Securing routing protocols, checking proxies, and validating DNS tunnels...</p>
                <div className={`w-40 h-1 mx-auto rounded-full overflow-hidden relative ${
                  isDark ? "bg-zinc-900" : "bg-zinc-200"
                }`}>
                  <motion.div 
                    className="h-full bg-violet-500" 
                    animate={{ width: `${progress}%` }} 
                    transition={{ ease: "easeInOut", duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-16"
            >
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <h2 className="text-xl font-bold">Inspection Fault</h2>
              <p className="text-zinc-500 text-xs max-w-sm">{error}</p>
              <button
                onClick={startAnalysis}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Check
              </button>
            </motion.div>
          ) : report ? (
            <motion.div
              key="results-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex-1 space-y-8"
            >
              {/* Centerpiece: Main IP & Geolocation (Apple/Linear Style) */}
              <div className={`border rounded-2xl p-8 text-center space-y-6 relative overflow-hidden backdrop-blur-md transition-all duration-300 ${
                isDark 
                  ? "bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700/80 shadow-2xl" 
                  : "bg-white/50 border-zinc-200/80 hover:border-zinc-300 shadow-md"
              }`}>
                {/* Glow behind IP */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-16 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      report.score >= 80 ? "bg-emerald-500 shadow-lg shadow-emerald-500/35" : "bg-amber-500 shadow-lg shadow-amber-500/35"
                    }`} />
                    <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">{report.status} Connection</span>
                  </div>

                  <h2 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-b from-zinc-100 via-zinc-100 to-zinc-400 bg-clip-text text-transparent break-all select-all py-1">
                    {isDark ? report.ip : <span className="text-zinc-900">{report.ip}</span>}
                  </h2>

                  {/* Geolocation Details & Windows-safe flag */}
                  <div className="flex items-center justify-center gap-3 text-sm text-zinc-400 font-semibold">
                    {report.country_code ? (
                      <img 
                        src={`https://flagcdn.com/w40/${report.country_code.toLowerCase()}.png`} 
                        alt={`${report.country} Flag`}
                        className="w-5 h-3.5 object-cover rounded border border-zinc-800 shadow-sm"
                      />
                    ) : null}
                    <span>{report.city}, {report.region}, {report.country}</span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className={`mx-auto max-w-md p-4 rounded-xl text-xs leading-relaxed border ${
                  isDark 
                    ? "bg-zinc-950/40 border-zinc-850/60 text-zinc-400" 
                    : "bg-zinc-100/50 border-zinc-200/60 text-zinc-600"
                }`}>
                  {report.summary}
                </div>
              </div>

              {/* Lower Section: Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* 1. Score Widget Card (Expandable) */}
                <motion.div 
                  layout
                  onClick={() => toggleExpand("score")}
                  className={`border rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                    expandedCard === "score" ? "row-span-2 md:col-span-2" : "h-40"
                  } ${
                    isDark 
                      ? "bg-zinc-900/30 border-zinc-850 hover:border-zinc-700/80 hover:bg-zinc-900/40" 
                      : "bg-white/50 border-zinc-200/85 hover:border-zinc-300 hover:bg-white/80 shadow-sm"
                  }`}
                >
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center w-full">
                    <span>Cleanliness score</span>
                    {expandedCard === "score" ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>
                  
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-extrabold tracking-tight text-violet-500">{report.score}</span>
                    <span className="text-xs text-zinc-500 font-semibold">/ 100</span>
                  </div>

                  <AnimatePresence>
                    {expandedCard === "score" && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-zinc-400 space-y-2 mt-4 border-t border-zinc-850/50 pt-3"
                      >
                        <div className="flex justify-between">
                          <span>VPN Penalty:</span>
                          <span className={report.vpn ? "text-amber-500 font-bold" : "text-zinc-500"}>{report.vpn ? "-25 points" : "0"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Proxy Penalty:</span>
                          <span className={report.proxy ? "text-amber-500 font-bold" : "text-zinc-500"}>{report.proxy ? "-30 points" : "0"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tor Penalty:</span>
                          <span className={report.tor ? "text-red-500 font-bold" : "text-zinc-500"}>{report.tor ? "-50 points" : "0"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hosting Penalty:</span>
                          <span className={report.hosting ? "text-violet-400 font-bold" : "text-zinc-500"}>{report.hosting ? "-15 points" : "0"}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="text-[11px] text-zinc-500 leading-normal mt-2">
                    {report.score >= 80 ? "No active proxies or reputational flags found." : "Certain flags have reduced your network trust score."}
                  </div>
                </motion.div>

                {/* 2. ISP Info Card (Expandable) */}
                <motion.div 
                  layout
                  onClick={() => toggleExpand("isp")}
                  className={`border rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                    expandedCard === "isp" ? "row-span-2 md:col-span-2" : "h-40"
                  } ${
                    isDark 
                      ? "bg-zinc-900/30 border-zinc-850 hover:border-zinc-700/80 hover:bg-zinc-900/40" 
                      : "bg-white/50 border-zinc-200/85 hover:border-zinc-300 hover:bg-white/80 shadow-sm"
                  }`}
                >
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center w-full">
                    <span>ISP Carrier & ASN</span>
                    {expandedCard === "isp" ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>

                  <div className="mt-2">
                    <div className="text-sm font-bold text-zinc-300 truncate max-w-full">{report.isp}</div>
                    <div className="text-xs font-semibold text-zinc-500 mt-1">Autonomous System: AS{report.asn}</div>
                  </div>

                  <AnimatePresence>
                    {expandedCard === "isp" && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-zinc-400 space-y-2 mt-4 border-t border-zinc-850/50 pt-3"
                      >
                        <div className="flex justify-between">
                          <span>Organization:</span>
                          <span className="font-bold text-zinc-300">{report.organization || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Latitude / Longitude:</span>
                          <span className="font-mono text-zinc-300">{report.latitude}, {report.longitude}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Timezone:</span>
                          <span className="font-bold text-zinc-300">{report.timezone}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="text-[11px] text-zinc-500 leading-normal mt-2">
                    Exposed under connection type <span className="font-bold text-violet-400 capitalize">{report.connection_type || "broadband"}</span>.
                  </div>
                </motion.div>

                {/* 3. Privacy & Leak status Card (Expandable) */}
                <motion.div 
                  layout
                  onClick={() => toggleExpand("privacy")}
                  className={`border rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                    expandedCard === "privacy" ? "row-span-2 md:col-span-2" : "h-40"
                  } ${
                    isDark 
                      ? "bg-zinc-900/30 border-zinc-850 hover:border-zinc-700/80 hover:bg-zinc-900/40" 
                      : "bg-white/50 border-zinc-200/85 hover:border-zinc-300 hover:bg-white/80 shadow-sm"
                  }`}
                >
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center w-full">
                    <span>Privacy Tunnels</span>
                    {expandedCard === "privacy" ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>

                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-semibold">VPN Detection:</span>
                      <span className={`font-bold ${report.vpn ? "text-amber-500" : "text-zinc-400"}`}>{report.vpn ? "Active" : "None"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-semibold">WebRTC Leak:</span>
                      <span className={`font-bold ${report.webrtc_leak === "Safe" ? "text-emerald-500" : "text-amber-500"}`}>{report.webrtc_leak}</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedCard === "privacy" && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-zinc-400 space-y-2 mt-4 border-t border-zinc-850/50 pt-3"
                      >
                        <div className="flex justify-between">
                          <span>Proxy Check:</span>
                          <span className={`font-bold ${report.proxy ? "text-amber-500" : "text-zinc-500"}`}>{report.proxy ? "Detected" : "Clean"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tor Gateway:</span>
                          <span className={`font-bold ${report.tor ? "text-red-500" : "text-zinc-500"}`}>{report.tor ? "Detected" : "Clean"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hosting Check:</span>
                          <span className={`font-bold ${report.hosting ? "text-violet-400" : "text-zinc-500"}`}>{report.hosting ? "Server Node" : "Residential"}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="text-[11px] text-zinc-500 leading-normal mt-2">
                    {report.vpn || report.proxy ? "Anonymization proxy is masking details." : "Direct local router routing detected."}
                  </div>
                </motion.div>

                {/* 4. Client Profile Card */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between h-40 backdrop-blur-sm transition-all duration-300 ${
                  isDark 
                    ? "bg-zinc-900/30 border-zinc-850 hover:border-zinc-700/80" 
                    : "bg-white/50 border-zinc-200/85 hover:border-zinc-300 shadow-sm"
                }`}>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Client Browser</span>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-zinc-300">{report.browser}</div>
                    <div className="text-xs font-semibold text-zinc-500 mt-1">v{report.browser_version}</div>
                  </div>
                  <div className="text-xs text-zinc-400 leading-normal">
                    Running on <span className="font-bold text-violet-400">{report.operating_system}</span>.
                  </div>
                </div>

                {/* 5. Routing Protocols Card */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between h-40 backdrop-blur-sm transition-all duration-300 ${
                  isDark 
                    ? "bg-zinc-900/30 border-zinc-850 hover:border-zinc-700/80" 
                    : "bg-white/50 border-zinc-200/85 hover:border-zinc-300 shadow-sm"
                }`}>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Routing Protocols</span>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-semibold">IPv6 Status:</span>
                      <span className={`font-bold ${report.ipv6 ? "text-emerald-500" : "text-zinc-400"}`}>{report.ipv6 ? "Available" : "No Route"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-semibold">HTTP Spec:</span>
                      <span className="font-bold text-zinc-400 uppercase">{report.http_version}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-semibold">TLS Spec:</span>
                      <span className="font-bold text-zinc-400 uppercase">{report.tls_version || "TLS 1.3"}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 leading-normal">
                    {report.ipv6 ? "Dual-stack IPv4/IPv6 resolved." : "IPv4 single-stack routing resolved."}
                  </div>
                </div>

                {/* 6. Hostname Card */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between h-40 backdrop-blur-sm transition-all duration-300 ${
                  isDark 
                    ? "bg-zinc-900/30 border-zinc-850 hover:border-zinc-700/80" 
                    : "bg-white/50 border-zinc-200/85 hover:border-zinc-300 shadow-sm"
                }`}>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hostname details</span>
                  <div className="text-xs font-mono text-zinc-450 break-all line-clamp-3 mt-2">
                    {report.hostname || "No Reverse DNS records map to this IP."}
                  </div>
                  <div className="text-xs text-zinc-500 leading-normal">
                    rDNS mapped node.
                  </div>
                </div>

              </div>

              {/* Perform Deep Re-Audit button with clean layout */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={startAnalysis}
                  className={`flex items-center gap-2.5 px-6 py-3 font-semibold rounded-xl text-sm transition-all shadow-md active:scale-95 border cursor-pointer ${
                    isDark 
                      ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-100 shadow-black/45" 
                      : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 shadow-zinc-200/60"
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-violet-500" />
                  Perform Deep Re-Audit
                </button>
              </div>

            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <footer className={`mt-16 text-center text-[10px] font-semibold tracking-wider uppercase border-t py-6 transition-colors duration-700 ${
          isDark ? "border-zinc-900 text-zinc-600" : "border-zinc-200 text-zinc-400"
        }`}>
          &copy; {new Date().getFullYear()} NeoCheck. Managed by Immutable Diagnostics.
        </footer>

      </div>
    </div>
  )
}
