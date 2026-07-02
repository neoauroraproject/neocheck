"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sun, Moon, RefreshCw, AlertTriangle, Compass, 
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert,
  Globe, Monitor, Lock, Server, Wifi, Cpu, PlaySquare, 
  MapPin, Copy, Share2, EyeOff, Activity, ChevronDown, Terminal
} from "lucide-react"

interface ScoreBreakdown {
  dns: number
  webrtc: number
  privacy: number
  reputation: number
  streaming: number
  ai: number
  security: number
}

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
  cipher_suite: string
  alpn: string
  hsts: boolean
  ocsp_stapling: boolean
  cert_issuer: string
  cert_expiration: string
  pfs: boolean
  secure_context: boolean
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
  asn_type: string
  cgnat: boolean
  carrier_class: string
  services: Record<string, boolean>
  summary: string
  score: number
  score_breakdown: ScoreBreakdown
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

  // Client-side dynamic WebRTC details
  const [webRTCData, setWebRTCData] = useState<{
    status: "Safe" | "Partial" | "Leak" | "Scanning" | "Unsupported"
    localIPv4: string[]
    localIPv6: string[]
    publicIPs: string[]
    candidates: any[]
    mdnsEnabled: boolean
    cgnat: boolean
  }>({
    status: "Scanning",
    localIPv4: [],
    localIPv6: [],
    publicIPs: [],
    candidates: [],
    mdnsEnabled: false,
    cgnat: false
  })

  // Client-side reachability results
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, "Reachable" | "Accessible" | "Blocked" | "Restricted" | "Unknown">>({})
  
  // Client-side refined OS & Browser details
  const [detectedBrowser, setDetectedBrowser] = useState({
    name: "Unknown",
    version: "Unknown",
    os: "Unknown",
    platform: "Unknown",
    language: "Unknown",
    arc: false,
    brave: false,
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

  // Load flag CDN fallback sequence
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

  // Client-side Browser, OS and Screen properties scan
  const detectClientDetails = async () => {
    if (typeof window === "undefined") return

    const match = window.matchMedia("(prefers-color-scheme: dark)")
    let browserName = "Unknown"
    let browserVer = "Unknown"
    let osName = "Unknown"
    let platformName = "Desktop"
    let isBrave = false
    let isArc = false

    // Brave check
    if (navigator.brave && await navigator.brave.isBrave()) {
      isBrave = true
    }

    // Arc check
    const arcVariable = getComputedStyle(document.documentElement).getPropertyValue('--arc-palette-title')
    if (arcVariable) {
      isArc = true
    }

    // UserAgent Hints API
    if (navigator.userAgentData) {
      const data = navigator.userAgentData
      platformName = data.mobile ? "Mobile" : "Desktop"
      
      const activeBrand = data.brands.find(b => b.brand !== "Not A(Brand" && b.brand !== "Chromium")
      if (activeBrand) {
        browserName = activeBrand.brand
        browserVer = activeBrand.version
      } else {
        browserName = "Chromium"
      }

      try {
        const highEntropy = await data.getHighEntropyValues(["platformVersion", "architecture"])
        const pv = parseFloat(highEntropy.platformVersion || "0")
        if (highEntropy.platform === "Windows" || data.platform === "Windows") {
          osName = pv >= 13 ? "Windows 11" : "Windows 10"
        } else {
          osName = data.platform || "Unknown OS"
        }
      } catch {
        osName = data.platform || "Unknown OS"
      }
    } else {
      // Fallback regex parsing
      const ua = navigator.userAgent
      const lowerUA = ua.toLowerCase()

      if (lowerUA.includes("mobi")) platformName = "Mobile"
      if (lowerUA.includes("ipad") || lowerUA.includes("tablet")) platformName = "Tablet"

      if (ua.includes("Windows NT 10.0")) osName = "Windows 10/11"
      else if (ua.includes("Windows NT 6.3")) osName = "Windows 8.1"
      else if (ua.includes("Windows NT 6.1")) osName = "Windows 7"
      else if (ua.includes("Mac OS X")) osName = "macOS"
      else if (ua.includes("iPhone") || ua.includes("iPad")) osName = "iOS"
      else if (ua.includes("Android")) osName = "Android"
      else if (ua.includes("Linux")) osName = "Linux"

      if (ua.includes("Edg/")) browserName = "Edge"
      else if (ua.includes("OPR/") || ua.includes("Opera/")) browserName = "Opera"
      else if (ua.includes("Vivaldi/")) browserName = "Vivaldi"
      else if (ua.includes("Firefox/")) browserName = "Firefox"
      else if (ua.includes("Chrome/")) browserName = "Chrome"
      else if (ua.includes("Safari/")) browserName = "Safari"
    }

    if (isBrave) browserName = "Brave"
    if (isArc) browserName = "Arc"

    setDetectedBrowser({
      name: browserName,
      version: browserVer,
      os: osName,
      platform: platformName,
      language: navigator.language || "en-US",
      arc: isArc,
      brave: isBrave,
      screen: `${window.screen.width}x${window.screen.height}`,
      darkMode: match.matches,
      cookies: navigator.cookieEnabled,
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      js: true
    })
  }

  // WebRTC ICE scanner that gathers and compares IPs
  const scanWebRTC = (currentPublicIP: string, isVpn: boolean) => {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.RTCPeerConnection) {
        setWebRTCData(prev => ({ ...prev, status: "Unsupported" }))
        resolve()
        return
      }

      setWebRTCData({
        status: "Scanning",
        localIPv4: [],
        localIPv6: [],
        publicIPs: [],
        candidates: [],
        mdnsEnabled: false,
        cgnat: false
      })

      const ipCandidates: any[] = []
      const localIPv4s: string[] = []
      const localIPv6s: string[] = []
      const publicIPs: string[] = []
      let mdnsEnabled = false
      let cgnat = false

      const rtc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun.xten.com" }
        ]
      })

      rtc.createDataChannel("")
      rtc.createOffer()
        .then(offer => rtc.setLocalDescription(offer))
        .catch(() => {})

      const concludeScan = () => {
        let status: "Safe" | "Partial" | "Leak" = "Safe"
        
        if (localIPv4s.length > 0 || localIPv6s.length > 0) {
          status = "Partial" // Private IPs leaked
        }

        if (publicIPs.length > 0) {
          // If we are on a VPN, but WebRTC exposes a public IP that differs from our connection IP
          const leakedDiff = publicIPs.some(pip => pip !== currentPublicIP)
          if (leakedDiff || isVpn) {
            status = "Leak" // Real ISP public IP leaked during proxy/VPN session
          }
        }

        setWebRTCData({
          status,
          localIPv4: localIPv4s,
          localIPv6: localIPv6s,
          publicIPs,
          candidates: ipCandidates,
          mdnsEnabled,
          cgnat
        })
        resolve()
      }

      const timeout = setTimeout(() => {
        rtc.close()
        concludeScan()
      }, 2500)

      rtc.onicecandidate = (event) => {
        if (!event.candidate) return
        const cand = event.candidate.candidate
        
        const parts = cand.split(" ")
        if (parts.length < 8) return

        const ip = parts[4]
        const port = parts[5]
        const proto = parts[2]
        const type = parts[7] // host, srflx, relay, prflx

        const isMdns = ip.endsWith(".local")
        if (isMdns) {
          mdnsEnabled = true
        }

        const isIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)
        const isIPv6 = ip.includes(":") && !isMdns

        const isPrivateIPv4 = isIPv4 && (
          ip.startsWith("10.") ||
          ip.startsWith("192.168.") ||
          (ip.startsWith("172.") && parseInt(ip.split(".")[1], 10) >= 16 && parseInt(ip.split(".")[1], 10) <= 31)
        )

        const isPrivateIPv6 = isIPv6 && (
          ip.startsWith("fe80:") || ip.startsWith("fc00:") || ip.startsWith("fd00:")
        )

        const isCGNAT = isIPv4 && ip.startsWith("100.") && (
          parseInt(ip.split(".")[1], 10) >= 64 && parseInt(ip.split(".")[1], 10) <= 127
        )

        if (isCGNAT) {
          cgnat = true
        }

        ipCandidates.push({ ip, port, proto, type, isMdns, isPrivate: isPrivateIPv4 || isPrivateIPv6 })

        if (isPrivateIPv4 && !localIPv4s.includes(ip)) {
          localIPv4s.push(ip)
        }
        if (isPrivateIPv6 && !localIPv6s.includes(ip)) {
          localIPv6s.push(ip)
        }
        if (!isMdns && !isPrivateIPv4 && !isPrivateIPv6 && type === "srflx" && !publicIPs.includes(ip)) {
          publicIPs.push(ip)
        }
      }
    })
  }

  // Probe services client side for CORS/Network Reachability
  const checkService = async (name: string, url: string, isVpnOrProxy: boolean) => {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 2200)

      await fetch(url, {
        mode: 'no-cors',
        credentials: 'omit',
        signal: controller.signal
      })
      clearTimeout(id)
      return isVpnOrProxy ? "Network Accessible" : "Accessible"
    } catch {
      return "Blocked"
    }
  }

  const runServiceChecks = async (isVpnOrProxy: boolean) => {
    const aiServices = [
      { name: "ChatGPT", url: "https://chatgpt.com/favicon.ico" },
      { name: "Gemini", url: "https://gemini.google.com/favicon.ico" },
      { name: "Claude", url: "https://claude.ai/favicon.ico" },
      { name: "Copilot", url: "https://copilot.microsoft.com/favicon.ico" }
    ]

    const streamingServices = [
      { name: "Netflix", url: "https://www.netflix.com/favicon.ico" },
      { name: "Spotify", url: "https://open.spotify.com/favicon.ico" },
      { name: "Disney+", url: "https://www.disneyplus.com/favicon.ico" },
      { name: "Prime", url: "https://www.primevideo.com/favicon.ico" }
    ]

    const results: Record<string, "Reachable" | "Accessible" | "Blocked" | "Restricted" | "Network Accessible" | "Unknown"> = {}

    await Promise.all([
      ...aiServices.map(async (svc) => {
        const res = await checkService(svc.name, svc.url, isVpnOrProxy)
        results[svc.name] = res
      }),
      ...streamingServices.map(async (svc) => {
        const res = await checkService(svc.name, svc.url, isVpnOrProxy)
        results[svc.name] = res
      })
    ])

    setServiceStatuses(results)
  }

  // Load Theme Settings and Branding Details
  useEffect(() => {
    if (typeof window !== "undefined") {
      const match = window.matchMedia("(prefers-color-scheme: dark)")
      setTheme(match.matches ? "dark" : "light")
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
      setProgress((prev) => (prev < 85 ? prev + 10 : prev))
    }, 200)

    try {
      const res = await fetch("/api/check")
      if (!res.ok) throw new Error("Failed to fetch diagnostics")
      const data = (await res.json()) as ConnectionReport
      clearInterval(timer)
      setProgress(90)
      
      // Parallelize client side scans
      await detectClientDetails()
      await Promise.all([
        scanWebRTC(data.ip, data.vpn || data.proxy || data.tor),
        runServiceChecks(data.vpn || data.proxy || data.tor)
      ])
      
      setProgress(100)
      setTimeout(() => {
        setReport(data)
        setLoading(false)
      }, 300)
    } catch {
      clearInterval(timer)
      setError("Unable to resolve connection check. Please verify backend status.")
      setLoading(false)
    }
  }

  useEffect(() => {
    startAnalysis()
  }, [])

  const isDark = theme === "dark"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

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

  // Generate recommendation rules dynamically
  const getActionableRecommendations = () => {
    if (!report) return []
    const list = []

    if (report.webrtc_leak === "Leak" || webRTCData.status === "Leak") {
      list.push({
        title: "Critical WebRTC IP Leak Detected",
        desc: "Your browser is exposing your real public/private IP directly via WebRTC, bypassing VPN tunnels. Install a WebRTC blocker or disable it in your browser settings.",
        severity: "critical"
      })
    } else if (webRTCData.status === "Partial") {
      list.push({
        title: "Partial WebRTC Leak (Local IPs)",
        desc: "Your local network structure (private IPs) is visible via WebRTC. While not your public IP, it helps trackers fingerprint you. Enable mDNS to hide private IPs.",
        severity: "warning"
      })
    }

    if (report.dns_leak === "Leak") {
      list.push({
        title: "Active DNS Leak Identified",
        desc: "Your DNS queries are leaking to your ISP's resolvers instead of going through the VPN's secure servers, exposing which domains you visit.",
        severity: "critical"
      })
    }

    if (report.vpn || report.proxy || report.tor) {
      list.push({
        title: "Traffic Routed Through Anonymizer",
        desc: "A VPN, Proxy or Tor connection is active. This shields your identity, but some highly protected services (e.g. streaming, bank portals) may flag or restrict this IP.",
        severity: "info"
      })
    }

    if (!report.https) {
      list.push({
        title: "Insecure Plaintext Connection",
        desc: "Your session does not use HTTPS. Anyone on the local network can read your data. Enforce HTTPS.",
        severity: "critical"
      })
    } else if (!report.hsts) {
      list.push({
        title: "Missing HSTS Protocol",
        desc: "HTTP Strict Transport Security (HSTS) is not enforced, leaving users open to SSL stripping attacks.",
        severity: "warning"
      })
    }

    if (report.risk_score > 25) {
      list.push({
        title: `High IP Fraud Score: ${report.risk_score}%`,
        desc: "This IP is flagged by security providers for history of spam, port scanning, or malicious activity.",
        severity: "warning"
      })
    }

    if (!report.ipv6) {
      list.push({
        title: "No IPv6 Configuration",
        desc: "Your ISP or network only supports IPv4. Enable IPv6 for improved routing efficiency and native end-to-end addressing.",
        severity: "info"
      })
    }

    if (list.length === 0) {
      list.push({
        title: "Excellent Connection Security",
        desc: "No critical leaks, active threats, or misconfigured TLS parameters were found on this network path.",
        severity: "success"
      })
    }

    return list
  }

  const recommendations = getActionableRecommendations()

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans relative overflow-hidden pb-12 ${
      isDark ? "bg-[#09090b] text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      
      {/* Background Dots */}
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
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex-1 space-y-8">
              
              {/* HERO CARD - WITH SCORE BREAKDOWN */}
              <div className={`rounded-2xl border overflow-hidden p-6 md:p-8 flex flex-col lg:flex-row gap-8 ${
                isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
              }`}>
                {/* Left Side: Connection Health Score */}
                <div className="flex-1 flex flex-col justify-center items-center lg:items-start text-center lg:text-left space-y-5 lg:border-r lg:pr-8 border-zinc-200 dark:border-zinc-800">
                  <div className="inline-flex items-center space-x-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Connection Health</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-end justify-center lg:justify-start gap-2 font-black">
                      <span className="text-7xl sm:text-8xl tracking-tighter text-zinc-900 dark:text-zinc-100">{report.score}</span>
                      <span className="text-2xl text-zinc-400 dark:text-zinc-600 pb-3">/100</span>
                    </div>
                    <div className="text-lg tracking-widest flex flex-col items-center lg:items-start justify-center gap-1.5">
                      {renderProgressBar(report.score)}
                      <div className="mt-1">{renderStars(report.score)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-bold text-zinc-500">
                    <span className={`px-3 py-1 rounded-md text-xs uppercase tracking-wider ${
                      report.score >= 90 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                        : report.score >= 75 
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" 
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {report.status}
                    </span>
                    <span>12 Tests Completed</span>
                    <span>{recommendations.filter(r => r.severity === "critical" || r.severity === "warning").length} Issues Detected</span>
                  </div>
                </div>

                {/* Right Side: Score Breakdown Graph */}
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Diagnostic Breakdown</h4>
                  
                  <div className="space-y-3">
                    {[
                      { label: "Security & TLS", value: report.score_breakdown?.security ?? 90 },
                      { label: "Anonymity & Privacy", value: report.score_breakdown?.privacy ?? 85 },
                      { label: "DNS Resolution", value: report.score_breakdown?.dns ?? 100 },
                      { label: "WebRTC Integrity", value: report.score_breakdown?.webrtc ?? 100 },
                      { label: "IP Reputation", value: report.score_breakdown?.reputation ?? 95 },
                      { label: "Streaming Support", value: report.score_breakdown?.streaming ?? 80 },
                      { label: "AI Platforms Reachability", value: report.score_breakdown?.ai ?? 80 },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                          <span className="font-mono">{item.value}/100</span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
                          <div 
                            className={`h-full rounded-full ${
                              item.value >= 90 
                                ? "bg-emerald-500" 
                                : item.value >= 70 
                                  ? "bg-violet-500" 
                                  : "bg-amber-500"
                            }`} 
                            style={{ width: `${item.value}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTIONABLE RECOMMENDATIONS & INSIGHTS */}
              <div className={`p-6 rounded-2xl border ${isDark ? "bg-zinc-900/40 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Actionable Insights & Warnings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border flex items-start gap-3 ${
                        rec.severity === "critical"
                          ? (isDark ? "bg-red-950/20 border-red-900/40 text-red-300" : "bg-red-50 border-red-200 text-red-900")
                          : rec.severity === "warning"
                            ? (isDark ? "bg-amber-950/20 border-amber-900/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900")
                            : rec.severity === "success"
                              ? (isDark ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900")
                              : (isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-900")
                      }`}
                    >
                      {rec.severity === "critical" && <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                      {rec.severity === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                      {rec.severity === "info" && <Compass className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />}
                      {rec.severity === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                      
                      <div className="space-y-1 text-xs">
                        <h4 className="font-bold">{rec.title}</h4>
                        <p className="opacity-80 leading-relaxed">{rec.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3-COLUMN DETAILED CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. IP & IDENTITY CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Identity & ASN
                      </h3>
                      <button onClick={() => copyToClipboard(report.ip)} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Copy IP">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-5 space-y-6">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Public IP Address</div>
                        <div className="text-2xl sm:text-3xl font-black tracking-tight text-violet-600 dark:text-violet-400 font-mono break-all">{report.ip}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div><div className="text-zinc-500 font-semibold mb-0.5">IPv4 / IPv6</div><div className="font-bold font-mono">{report.ipv4 ? "v4" : ""} {report.ipv6 ? "v6" : ""}</div></div>
                        <div><div className="text-zinc-500 font-semibold mb-0.5">ASN</div><div className="font-bold font-mono">AS{report.asn || "---"}</div></div>
                        <div className="col-span-2"><div className="text-zinc-500 font-semibold mb-0.5">ISP / Organization</div><div className="font-bold truncate">{report.isp}</div></div>
                        <div className="col-span-2"><div className="text-zinc-500 font-semibold mb-0.5">Hostname</div><div className="font-bold font-mono text-[10px] break-all">{report.hostname || "N/A"}</div></div>
                        <div className="col-span-2"><div className="text-zinc-500 font-semibold mb-0.5">Reverse DNS</div><div className="font-bold font-mono text-[10px] break-all">{report.reverse_dns || "N/A"}</div></div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify({ ip: report.ip, hostname: report.hostname, reverse_dns: report.reverse_dns, connection_type: report.connection_type, ipv4: report.ipv4, ipv6: report.ipv6, isp: report.isp, org: report.organization, asn: report.asn }, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 2. GEOLOCATION CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Geolocation
                      </h3>
                    </div>
                    <div className="p-5 flex flex-col items-center text-center">
                      {report.country_code && flagUrl !== "ERROR" ? (
                        <div className="mb-4 rounded-lg overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60 shadow-md w-20 h-12 relative shrink-0">
                          {flagUrl ? (
                            <img src={flagUrl} alt={report.country} className="w-full h-full object-cover block" onError={handleFlagError} />
                          ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <Globe className="w-12 h-12 text-zinc-400 mb-4 opacity-50" />
                      )}
                      
                      <h4 className="text-lg font-black mb-1 leading-tight">
                        {report.country_code ? `${getCountryEmoji(report.country_code)} ` : ""}{report.country || "Unknown Country"}
                      </h4>
                      <p className="text-zinc-500 text-xs font-bold mb-5">{report.city}{report.region ? `, ${report.region}` : ""}</p>
                      
                      <div className="w-full grid grid-cols-2 gap-4 text-left text-xs">
                        <div><div className="text-zinc-500 font-semibold mb-0.5">Timezone</div><div className="font-bold truncate">{report.timezone}</div></div>
                        <div><div className="text-zinc-500 font-semibold mb-0.5">Coordinates</div><div className="font-bold font-mono truncate">{report.latitude}, {report.longitude}</div></div>
                        <div><div className="text-zinc-500 font-semibold mb-0.5">Carrier ISP Class</div><div className="font-bold truncate">{report.carrier_class || "Broadband"}</div></div>
                        <div><div className="text-zinc-500 font-semibold mb-0.5">CGNAT Detection</div><div className="font-bold">{webRTCData.cgnat || report.cgnat ? "Yes (Shared IP)" : "No (Direct IP)"}</div></div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify({ country: report.country, country_code: report.country_code, region: report.region, city: report.city, latitude: report.latitude, longitude: report.longitude, timezone: report.timezone, carrier_class: report.carrier_class, cgnat: webRTCData.cgnat || report.cgnat }, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 3. SECURITY & TLS DIAGNOSTICS CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Security & TLS
                      </h3>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                      <div><div className="text-zinc-500 font-semibold mb-0.5">HTTPS</div><div className={`font-bold flex items-center gap-1 ${report.https ? "text-emerald-500" : "text-red-500"}`}>{report.https ? "Enforced" : "No"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">TLS Version</div><div className="font-bold">{report.tls_version || "None"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">HTTP Version</div><div className="font-bold">{report.http_version || "HTTP/1.1"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">HSTS status</div><div className="font-bold">{report.hsts ? "Active" : "Inactive"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">ALPN Negotiation</div><div className="font-bold font-mono">{report.alpn || "None"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">OCSP Stapling</div><div className="font-bold">{report.ocsp_stapling ? "Stapled" : "No"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">Forward Secrecy (PFS)</div><div className="font-bold">{report.pfs ? "Supported" : "No"}</div></div>
                      <div><div className="text-zinc-500 font-semibold mb-0.5">Secure Context</div><div className="font-bold">{detectedBrowser.js && window.isSecureContext ? "Yes" : "No"}</div></div>
                      <div className="col-span-2"><div className="text-zinc-500 font-semibold mb-0.5">Cipher Suite</div><div className="font-bold font-mono text-[10px] break-all leading-normal">{report.cipher_suite || "N/A"}</div></div>
                      <div className="col-span-2"><div className="text-zinc-500 font-semibold mb-0.5">Certificate Issuer</div><div className="font-bold truncate">{report.cert_issuer || "N/A"}</div></div>
                      <div className="col-span-2"><div className="text-zinc-500 font-semibold mb-0.5">Certificate Expiry</div><div className="font-bold">{report.cert_expiration || "N/A"}</div></div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify({ https: report.https, http_version: report.http_version, tls_version: report.tls_version, cipher_suite: report.cipher_suite, alpn: report.alpn, hsts: report.hsts, ocsp_stapling: report.ocsp_stapling, cert_issuer: report.cert_issuer, cert_expiration: report.cert_expiration, pfs: report.pfs, secure_context: window.isSecureContext }, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 4. PRIVACY PROFILE CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <EyeOff className="w-4 h-4" /> Privacy & Fraud Risk
                      </h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2 text-xs font-semibold">
                        <span className="text-zinc-500">VPN / Tunnel Node</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.vpn ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>{report.vpn ? "YES" : "NO"}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2 text-xs font-semibold">
                        <span className="text-zinc-500">Tor Exit Node</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.tor ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>{report.tor ? "YES" : "NO"}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2 text-xs font-semibold">
                        <span className="text-zinc-500">Proxy Active</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.proxy ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>{report.proxy ? "YES" : "NO"}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2 text-xs font-semibold">
                        <span className="text-zinc-500">Datacenter / Hosting</span>
                        <span className="text-zinc-800 dark:text-zinc-200">{report.hosting ? "Yes (Hosting IP)" : "No (User Line)"}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2 text-xs font-semibold">
                        <span className="text-zinc-500">ASN Classification</span>
                        <span className="text-zinc-800 dark:text-zinc-200 capitalize">{report.asn_type || "Residential"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-zinc-500">Fraud Risk Score</span>
                        <span className={`font-mono font-bold ${report.risk_score > 35 ? "text-amber-500" : report.risk_score > 70 ? "text-red-500" : "text-emerald-500"}`}>{report.risk_score}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify({ risk_score: report.risk_score, hosting: report.hosting, vpn: report.vpn, proxy: report.proxy, tor: report.tor, anonymous: report.anonymous, mobile: report.mobile, residential: report.residential, datacenter: report.datacenter, asn_type: report.asn_type, carrier_class: report.carrier_class }, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 5. WEBRTC DETAILS CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <Wifi className="w-4 h-4" /> WebRTC Leak Check
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        webRTCData.status === "Safe" 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : webRTCData.status === "Partial"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500"
                      }`}>
                        {webRTCData.status === "Scanning" ? "Scanning..." : webRTCData.status === "Partial" ? "Partial Leak" : webRTCData.status === "Leak" ? "LEAK DETECTED" : "No Leak"}
                      </span>
                    </div>
                    <div className="p-5 space-y-4 text-xs font-semibold">
                      <div>
                        <div className="text-zinc-500 mb-1">Public Candidates (Reflexive)</div>
                        <div className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
                          {webRTCData.publicIPs.length > 0 ? webRTCData.publicIPs.join(", ") : "None Detected"}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-zinc-500 mb-1">Local IPv4</div>
                          <div className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
                            {webRTCData.localIPv4.length > 0 ? webRTCData.localIPv4.join(", ") : "Hidden / None"}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Local IPv6</div>
                          <div className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
                            {webRTCData.localIPv6.length > 0 ? webRTCData.localIPv6.join(", ") : "Hidden / None"}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">mDNS Status</div>
                          <div className="text-zinc-800 dark:text-zinc-200">{webRTCData.mdnsEnabled ? "Enabled (mDNS Active)" : "Disabled"}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">STUN Servers</div>
                          <div className="text-zinc-800 dark:text-zinc-200">4 Queried</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify(webRTCData, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 6. SERVICE AVAILABILITY CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <Cpu className="w-4 h-4" /> Service Reachability
                      </h3>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* AI Services */}
                      <div>
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">AI Platforms</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold">
                          {["ChatGPT", "Gemini", "Claude", "Copilot"].map(svc => (
                            <div key={svc} className="flex justify-between items-center">
                              <span className="text-zinc-600 dark:text-zinc-400">{svc}</span>
                              <span className={`text-[10px] font-bold ${
                                serviceStatuses[svc] === "Accessible" || serviceStatuses[svc] === "Reachable"
                                  ? "text-emerald-500"
                                  : serviceStatuses[svc] === "Network Accessible" || serviceStatuses[svc] === "Restricted"
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`}>
                                {serviceStatuses[svc] || "Testing..."}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Streaming Services */}
                      <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Streaming Platforms</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold">
                          {["Netflix", "Spotify", "Disney+", "Prime"].map(svc => (
                            <div key={svc} className="flex justify-between items-center">
                              <span className="text-zinc-600 dark:text-zinc-400">{svc}</span>
                              <span className={`text-[10px] font-bold ${
                                serviceStatuses[svc] === "Accessible" || serviceStatuses[svc] === "Reachable"
                                  ? "text-emerald-500"
                                  : serviceStatuses[svc] === "Network Accessible" || serviceStatuses[svc] === "Restricted"
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`}>
                                {serviceStatuses[svc] || "Testing..."}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify({ liveServiceStatuses: serviceStatuses, backendServices: report.services }, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

                {/* 7. DETECTED BROWSER CARD */}
                <div className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex-1">
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        <Monitor className="w-4 h-4" /> Client Parameters
                      </h3>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-semibold">
                      <div><div className="text-zinc-500 font-bold mb-0.5">Browser</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.name} {detectedBrowser.version !== "Unknown" ? detectedBrowser.version : ""}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">OS</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.os}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">Platform</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.platform}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">Language</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.language}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">Screen Dimensions</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.screen || "---"}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">Cookies Active</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.cookies ? "Yes" : "No"}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">JavaScript Engine</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.js ? "Active" : "Blocked"}</div></div>
                      <div><div className="text-zinc-500 font-bold mb-0.5">Touch Inputs</div><div className="truncate text-zinc-800 dark:text-zinc-200">{detectedBrowser.touch ? "Supported" : "None"}</div></div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <details className="group mt-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <summary className="flex justify-between items-center text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                        <span>TECHNICAL DETAILS</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 text-left">
                        <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-48">
                          {JSON.stringify({ detectedBrowser, rawUserAgent: report.user_agent }, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>

              </div>

              {/* RE-SCAN SCAN NETWORK BUTTON */}
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
