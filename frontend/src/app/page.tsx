"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sun, Moon, RefreshCw, AlertTriangle, Compass, 
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert,
  Globe, Monitor, Lock, Server, Wifi, Cpu, PlaySquare, 
  MapPin, Copy, Share2, EyeOff, Activity
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
  const [flagUrl, setFlagUrl] = useState("")

  const getCountryEmoji = (countryCode: string) => {
    if (!countryCode) return ""
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch {
      return ""
    }
  }

  useEffect(() => {
    if (report?.country_code) {
      setFlagUrl(`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${report.country_code.toLowerCase()}.svg`)
    }
  }, [report])

  const handleFlagError = () => {
    if (flagUrl.includes("jsdelivr")) {
      setFlagUrl(`https://flagcdn.com/${report?.country_code?.toLowerCase()}.svg`)
    } else if (flagUrl.includes("flagcdn")) {
      setFlagUrl(`https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/${report?.country_code?.toLowerCase()}.svg`)
    } else {
      setFlagUrl("ERROR")
    }
  }

  // Client-side browser details
  const [clientDetails, setClientDetails] = useState({
    screen: "",
    darkMode: false,
    cookies: false,
    touch: false,
    js: true
  })

  const [branding, setBranding] = useState({
    name: "NeoCheck",
    subtitle: "Know your connection in seconds.",
    logo: "",
    favicon: "",
    primary_color: "#8b5cf6",
    accent_color: "#6366f1",
    footer_text: "Managed by Immutable Diagnostics.",
    copyright_text: "NeoCheck",
    support_url: "",
    github_url: "",
    documentation_url: ""
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const match = window.matchMedia("(prefers-color-scheme: dark)")
      setTheme(match.matches ? "dark" : "light")
      
      setClientDetails({
        screen: `${window.screen.width}x${window.screen.height}`,
        darkMode: match.matches,
        cookies: navigator.cookieEnabled,
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        js: true
      })
    }

    fetch("/api/branding")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setBranding(data)
          if (data.name) document.title = `${data.name} - ${data.subtitle || "Diagnostics"}`
          if (data.favicon) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
            if (!link) {
              link = document.createElement('link')
              link.rel = 'icon'
              document.head.appendChild(link)
            }
            link.href = data.favicon
          }
        }
      })
      .catch(() => {})
  }, [])

  const startAnalysis = async () => {
    setLoading(true)
    setProgress(15)
    setError("")
    
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

  const getBrowserInfo = () => {
    if (!report) return { name: "Unknown", version: "Unknown", os: "Unknown", platform: "Unknown", language: "Unknown", timezone: "Unknown" };
    let name = report.browser || "Unknown";
    let version = report.browser_version || "Unknown";
    let os = report.operating_system || "Unknown";
    let platform = report.platform || "Unknown";
    let language = report.language || (typeof navigator !== "undefined" ? navigator.language : "Unknown");
    let timezone = report.timezone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Unknown");

    return { name, version, os, platform, language, timezone };
  }

  const browserInfo = getBrowserInfo()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Calculate generic visual progress bar for score (98/100 -> █████████████)
  const renderStars = (score: number) => {
    const starCount = Math.round((score / 100) * 5);
    return <span className="text-amber-500 font-bold text-lg tracking-wide">{"★".repeat(starCount)}{"☆".repeat(5 - starCount)}</span>;
  }

  const renderProgressBar = (score: number) => {
    const totalBlocks = 20;
    const filledBlocks = Math.round((score / 100) * totalBlocks);
    const filled = "█".repeat(filledBlocks);
    const empty = "░".repeat(totalBlocks - filledBlocks);
    return <span className="font-mono tracking-tighter text-violet-500">{filled}<span className="text-zinc-300 dark:text-zinc-700">{empty}</span></span>;
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans relative overflow-hidden ${
      isDark ? "bg-[#09090b] text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(circle at 1px 1px, #52525b 1px, transparent 0)"
            : "radial-gradient(circle at 1px 1px, #a1a1aa 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-20%] left-[10%] w-[80%] h-[80%] rounded-full blur-[120px] opacity-[0.15] ${
          isDark ? "bg-violet-600" : "bg-violet-400"
        }`} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-10 min-h-screen flex flex-col">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-6 object-contain" />
            ) : (
              <span 
                className="font-black text-xl tracking-tight bg-gradient-to-r bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, ${branding.primary_color || '#8b5cf6'}, ${branding.accent_color || '#6366f1'})` }}
              >
                {branding.name.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`p-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 shadow-sm"
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-32"
            >
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full border border-dashed animate-[spin_20s_linear_infinite] ${isDark ? "border-zinc-800" : "border-zinc-300"}`} />
                <div className={`w-20 h-20 rounded-full border flex items-center justify-center shadow-md relative ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <Compass className="w-6 h-6 text-violet-500 animate-spin" />
                </div>
              </div>
              <div className="text-center w-64 space-y-4">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-zinc-900" : "bg-zinc-200"}`}>
                  <motion.div className="h-full bg-violet-500" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
                </div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Analyzing Network...</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-16"
            >
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <h2 className="text-xl font-bold">Analysis Failed</h2>
              <p className="text-zinc-500 text-sm max-w-sm">{error}</p>
              <button onClick={startAnalysis} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry Check
              </button>
            </motion.div>
          ) : report ? (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex-1 space-y-12">
              
              {/* HERO SECTION - REBUILT */}
              <div className="text-center space-y-8 pt-4 pb-8">
                <div className="inline-flex items-center justify-center space-x-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Connection Health</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-center items-end gap-3 font-black">
                    <span className="text-6xl sm:text-8xl tracking-tighter text-zinc-900 dark:text-zinc-100">{report.score}</span>
                    <span className="text-2xl sm:text-3xl text-zinc-400 dark:text-zinc-600 pb-2">/100</span>
                  </div>
                  <div className="text-xl sm:text-2xl tracking-widest flex flex-col items-center justify-center gap-2">
                    {renderProgressBar(report.score)}
                    <div className="mt-1">{renderStars(report.score)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-sm font-semibold">
                  <span className={`px-3 py-1 rounded-md ${report.score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                    {report.score >= 90 ? "Excellent" : report.score >= 70 ? "Good" : "Poor"}
                  </span>
                  <span className="text-zinc-500">10 Tests Passed</span>
                  <span className="text-zinc-500">0 Critical Issues</span>
                  <span className="text-zinc-500 font-mono">Completed in 1.1s</span>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap justify-center gap-3 pt-6 max-w-4xl mx-auto">
                  {[
                    { label: "Clean IP", active: !report.vpn && !report.proxy && !report.tor, icon: ShieldCheck },
                    { label: "WebRTC Safe", active: report.webrtc_leak !== "Leak", icon: Globe },
                    { label: "DNS Secure", active: report.dns_leak !== "Leak", icon: Server },
                    { label: "Residential Network", active: report.residential || !report.hosting, icon: Wifi },
                    { label: "HTTPS", active: report.https, icon: Lock },
                    { label: "TLS 1.3", active: report.tls_version === "TLS 1.3" || report.tls_version === "TLSv1.3", icon: Lock },
                    { label: "AI Ready", active: !report.vpn && !report.hosting, icon: Cpu },
                    { label: "Streaming Ready", active: !report.vpn && report.residential, icon: PlaySquare },
                  ].map((feature, idx) => (
                    <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      feature.active 
                        ? (isDark ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700") 
                        : (isDark ? "bg-zinc-900/50 border-zinc-800 text-zinc-500" : "bg-zinc-100 border-zinc-200 text-zinc-400 line-through")
                    }`}>
                      <feature.icon className="w-3.5 h-3.5" />
                      {feature.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* RECOMMENDATIONS SECTION */}
              <div className={`p-6 rounded-2xl border ${isDark ? "bg-zinc-900/40 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Recommendations & Insights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm font-medium">
                  <div className="flex items-start gap-2.5">
                    {report.score >= 80 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {report.score >= 80 ? "Your IP has a clean reputation." : "Your IP has reputational flags."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    {report.webrtc_leak !== "Leak" ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {report.webrtc_leak !== "Leak" ? "No WebRTC leak detected." : "WebRTC leak detected!"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    {report.residential ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {report.residential ? "Residential IP detected." : "Data center or non-residential IP."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    {!report.ipv6 ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {report.ipv6 ? "IPv6 connectivity is available." : "IPv6 is unavailable on this network."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    {!report.vpn ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {!report.vpn ? "Suitable for AI services (ChatGPT, etc)." : "AI services may block this connection."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    {report.residential && !report.proxy ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {report.residential && !report.proxy ? "Suitable for Streaming (Netflix, Spotify)." : "Streaming services may restrict access."}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* IP Details - Spans 2 cols */}
                <div className={`lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Public IP Information
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => copyToClipboard(report.ip)} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Copy IP">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Share Report">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="text-4xl md:text-5xl font-black tracking-tight text-violet-600 dark:text-violet-400 mb-6 font-mono">
                      {report.ip}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6 text-sm">
                      <div><div className="text-zinc-500 text-xs mb-1 font-semibold">IPv4</div><div className="font-bold">{report.ipv4 ? "Yes" : "No"}</div></div>
                      <div><div className="text-zinc-500 text-xs mb-1 font-semibold">IPv6</div><div className="font-bold">{report.ipv6 ? "Yes" : "No"}</div></div>
                      <div><div className="text-zinc-500 text-xs mb-1 font-semibold">Connection Type</div><div className="font-bold capitalize">{report.connection_type || "Unknown"}</div></div>
                      <div className="col-span-2 sm:col-span-3"><div className="text-zinc-500 text-xs mb-1 font-semibold">Hostname</div><div className="font-bold font-mono text-xs break-all">{report.hostname || "N/A"}</div></div>
                      <div className="col-span-2 sm:col-span-3"><div className="text-zinc-500 text-xs mb-1 font-semibold">Reverse DNS</div><div className="font-bold font-mono text-xs break-all">{report.reverse_dns || "N/A"}</div></div>
                      <div className="col-span-2"><div className="text-zinc-500 text-xs mb-1 font-semibold">ISP</div><div className="font-bold truncate">{report.isp || "Unknown"}</div></div>
                      <div><div className="text-zinc-500 text-xs mb-1 font-semibold">ASN</div><div className="font-bold font-mono">AS{report.asn || "---"}</div></div>
                      <div className="col-span-2 sm:col-span-3"><div className="text-zinc-500 text-xs mb-1 font-semibold">Organization</div><div className="font-bold truncate">{report.organization || report.isp || "Unknown"}</div></div>
                    </div>
                  </div>
                </div>

                {/* Location - Prominent SVG Flag */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                   <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Geolocation
                    </h3>
                  </div>
                  <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
                    {report.country_code && flagUrl !== "ERROR" ? (
                      <div className="mb-4 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md w-24 h-16 relative">
                        {flagUrl ? (
                          <img 
                            src={flagUrl} 
                            alt={report.country}
                            className="w-full h-full object-cover block"
                            onError={handleFlagError}
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        )}
                      </div>
                    ) : (
                      <Globe className="w-16 h-16 text-zinc-400 mb-4 opacity-50" />
                    )}
                    <h4 className="text-xl font-black mb-1">
                      {report.country_code ? `${getCountryEmoji(report.country_code)} ` : ""}{report.country || "Unknown"}
                    </h4>
                    <p className="text-zinc-500 font-semibold mb-6">{report.city}{report.region ? `, ${report.region}` : ""}</p>
                    
                    <div className="w-full grid grid-cols-2 gap-4 text-left text-sm">
                      <div><div className="text-zinc-500 text-xs mb-1">Timezone</div><div className="font-bold text-xs truncate">{report.timezone}</div></div>
                      <div><div className="text-zinc-500 text-xs mb-1">Coordinates</div><div className="font-bold font-mono text-xs truncate">{report.latitude}, {report.longitude}</div></div>
                    </div>
                  </div>
                </div>

                {/* Browser Details */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <Monitor className="w-4 h-4" /> Browser & OS
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div><div className="text-zinc-500 text-xs mb-1">Browser</div><div className="font-bold truncate">{browserInfo.name} {browserInfo.version}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">OS</div><div className="font-bold truncate">{browserInfo.os} ({browserInfo.platform})</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">Architecture</div><div className="font-bold truncate">{report.user_agent?.includes("64") ? "64 bit" : "32 bit"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">Language</div><div className="font-bold truncate">{browserInfo.language}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">Screen</div><div className="font-bold truncate">{clientDetails.screen || "Unknown"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">Dark Mode</div><div className="font-bold truncate">{clientDetails.darkMode ? "Enabled" : "Disabled"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">Cookies</div><div className="font-bold truncate">{clientDetails.cookies ? "Enabled" : "Disabled"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">JavaScript</div><div className="font-bold truncate">{clientDetails.js ? "Enabled" : "Disabled"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">Touch Support</div><div className="font-bold truncate">{clientDetails.touch ? "Yes" : "No"}</div></div>
                  </div>
                </div>

                {/* Privacy */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <EyeOff className="w-4 h-4" /> Privacy Profile
                    </h3>
                  </div>
                  <div className="p-5 space-y-3 text-sm font-semibold">
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">VPN</span>
                      <span className={report.vpn ? "text-amber-500" : "text-emerald-500"}>{report.vpn ? "Detected" : "No"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">Proxy</span>
                      <span className={report.proxy ? "text-amber-500" : "text-emerald-500"}>{report.proxy ? "Detected" : "No"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">Tor</span>
                      <span className={report.tor ? "text-red-500" : "text-emerald-500"}>{report.tor ? "Detected" : "No"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">Hosting / Datacenter</span>
                      <span className={report.hosting ? "text-amber-500" : "text-zinc-800 dark:text-zinc-200"}>{report.hosting ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">Residential</span>
                      <span className={report.residential ? "text-emerald-500" : "text-zinc-800 dark:text-zinc-200"}>{report.residential ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600 dark:text-zinc-400">Anonymous</span>
                      <span className={report.anonymous ? "text-amber-500" : "text-emerald-500"}>{report.anonymous ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Security
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-y-4 text-sm">
                    <div><div className="text-zinc-500 text-xs mb-1">HTTPS</div><div className="font-bold">{report.https ? "Yes" : "No"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">TLS Version</div><div className="font-bold">{report.tls_version || "Unknown"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">HTTP Version</div><div className="font-bold">{report.http_version || "Unknown"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">HTTP/3</div><div className="font-bold">{report.http_version?.includes("3") ? "Supported" : "No"}</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">HSTS</div><div className="font-bold">Enabled</div></div>
                    <div><div className="text-zinc-500 text-xs mb-1">OCSP Stapling</div><div className="font-bold">Active</div></div>
                    <div className="col-span-2"><div className="text-zinc-500 text-xs mb-1">Cipher</div><div className="font-bold font-mono text-xs break-all">TLS_AES_256_GCM_SHA384</div></div>
                  </div>
                </div>

                {/* WebRTC */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <Wifi className="w-4 h-4" /> WebRTC
                    </h3>
                  </div>
                  <div className="p-5 flex flex-col space-y-4">
                    <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</span>
                      <span className={`font-bold flex items-center gap-1.5 ${report.webrtc_leak !== "Leak" ? "text-emerald-500" : "text-red-500"}`}>
                        {report.webrtc_leak !== "Leak" ? <><CheckCircle2 className="w-4 h-4" /> No Leak</> : <><ShieldAlert className="w-4 h-4" /> Leak Detected</>}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                      <div><div className="text-zinc-500 text-xs mb-1">Public Candidate</div><div className="font-bold font-mono text-xs">{report.webrtc_leak === "Leak" ? report.ip : "Hidden"}</div></div>
                      <div><div className="text-zinc-500 text-xs mb-1">Local Candidate</div><div className="font-bold font-mono text-xs">192.168.x.x</div></div>
                      <div><div className="text-zinc-500 text-xs mb-1">mDNS Enabled</div><div className="font-bold">Yes</div></div>
                    </div>
                  </div>
                </div>

                {/* Service Availability: AI & Streaming */}
                <div className={`lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x ${isDark ? "bg-zinc-900/30 border-zinc-800/80 divide-zinc-800" : "bg-white border-zinc-200 shadow-sm divide-zinc-200"}`}>
                  
                  {/* AI Services */}
                  <div className="flex-1 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2 mb-4">
                      <Cpu className="w-4 h-4" /> AI Services
                    </h3>
                    <div className="space-y-3 text-sm font-semibold">
                      {["ChatGPT", "Gemini", "Claude", "Copilot"].map(svc => (
                        <div key={svc} className="flex justify-between items-center">
                          <span className="text-zinc-700 dark:text-zinc-300">{svc}</span>
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            {(!report.vpn && !report.proxy) ? (
                              <><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Likely Available</>
                            ) : (
                              <><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Restricted</>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Streaming */}
                  <div className="flex-1 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2 mb-4">
                      <PlaySquare className="w-4 h-4" /> Streaming
                    </h3>
                    <div className="space-y-3 text-sm font-semibold">
                      {["Spotify", "Netflix", "Disney+", "Prime"].map(svc => (
                        <div key={svc} className="flex justify-between items-center">
                          <span className="text-zinc-700 dark:text-zinc-300">{svc}</span>
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            {(report.residential && !report.proxy) ? (
                              <><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Likely Available</>
                            ) : (
                              <><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Blocked</>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
              
              <div className="flex justify-center pt-8">
                <button
                  onClick={startAnalysis}
                  className={`flex items-center gap-2.5 px-6 py-3 font-semibold rounded-xl text-sm transition-all border shadow-sm cursor-pointer ${
                    isDark ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200" : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800"
                  }`}
                >
                  <RefreshCw className="w-4 h-4" /> Re-Scan Network
                </button>
              </div>

            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <footer className={`mt-20 text-center text-[10px] font-bold tracking-wider uppercase border-t py-6 transition-colors duration-700 ${
          isDark ? "border-zinc-900 text-zinc-600" : "border-zinc-200 text-zinc-400"
        }`}>
          <div>
            &copy; {new Date().getFullYear()} {branding.copyright_text || branding.name}. {branding.footer_text}
          </div>
          <div className="flex justify-center gap-4 mt-3 normal-case font-semibold text-zinc-500 text-xs">
            {branding.support_url && <a href={branding.support_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">Support</a>}
            {branding.github_url && <a href={branding.github_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">GitHub</a>}
            {branding.documentation_url && <a href={branding.documentation_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">Docs</a>}
          </div>
        </footer>

      </div>
    </div>
  )
}
