"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sun, Moon, RefreshCw, AlertTriangle, Compass, 
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert,
  Globe, Monitor, Lock, Server, Wifi, Cpu, PlaySquare, 
  MapPin, Copy, Share2, EyeOff, Activity, ChevronDown, Terminal, Info
} from "lucide-react"

interface ScoreBreakdown {
  network: number
  dns: number
  webrtc: number
  fingerprint: number
  security: number
  reputation: number
  compatibility: number
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

  // Expanded card section keys tracker
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Browser fingerprint state
  const [fingerprintData, setFingerprintData] = useState<{
    canvas: string
    webglVendor: string
    webglRenderer: string
    audio: string
    fonts: string[]
  }>({
    canvas: "Calculating...",
    webglVendor: "Calculating...",
    webglRenderer: "Calculating...",
    audio: "Calculating...",
    fonts: []
  })

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
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, "Reachable" | "Accessible" | "Blocked" | "Restricted" | "Network Accessible" | "Unknown">>({})
  
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
    subtitle: "Premium Privacy Exposure & VPN Audit Platform",
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

  const toggleCard = (cardKey: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }))
  }

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

  // Asynchronous browser Canvas fingerprint scan
  const getCanvasFingerprint = () => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return { data: "Unsupported" }
      ctx.textBaseline = "top"
      ctx.font = "14px 'Arial'"
      ctx.fillStyle = "#f60"
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = "#069"
      ctx.fillText("NeoCheck, @~^", 2, 15)
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillText("NeoCheck, @~^", 4, 17)
      const data = canvas.toDataURL()
      
      let hash = 0
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return { data: "canvas_" + Math.abs(hash).toString(16) }
    } catch {
      return { data: "Blocked" }
    }
  }

  // WebGL vendor and renderer probe
  const getWebGLFingerprint = () => {
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      if (!gl) return { vendor: "N/A", renderer: "N/A" }
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
      if (!debugInfo) return { vendor: "Generic/Blocked", renderer: "Generic/Blocked" }
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ""
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ""
      return { vendor, renderer }
    } catch {
      return { vendor: "Blocked", renderer: "Blocked" }
    }
  }

  // Async audio synthesizer fingerprint check
  const getAudioFingerprint = () => {
    return new Promise<{ hash: string }>((resolve) => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) {
          resolve({ hash: "Unsupported" })
          return
        }
        const context = new AudioContextClass()
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()
        const analyser = context.createAnalyser()
        
        oscillator.type = "sine"
        oscillator.frequency.value = 440
        gainNode.gain.value = 0 // Mute audio output
        
        oscillator.connect(gainNode)
        gainNode.connect(analyser)
        analyser.connect(context.destination)
        
        oscillator.start(0)
        
        setTimeout(() => {
          const bufferLength = analyser.frequencyBinCount
          const dataArray = new Uint8Array(bufferLength)
          analyser.getByteTimeDomainData(dataArray)
          
          let hash = 0
          for (let i = 0; i < dataArray.length; i++) {
            hash = ((hash << 5) - hash) + dataArray[i]
            hash = hash & hash
          }
          oscillator.stop()
          context.close()
          resolve({ hash: "audio_" + Math.abs(hash).toString(16) })
        }, 100)
      } catch {
        resolve({ hash: "Blocked" })
      }
    })
  }

  const checkFont = (fontName: string) => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return false
      const text = "abcdefghijklmnopqrstuvwxyz0123456789"
      ctx.font = "72px sans-serif"
      const baselineWidth = ctx.measureText(text).width
      ctx.font = `72px '${fontName}', sans-serif`
      const testWidth = ctx.measureText(text).width
      return testWidth !== baselineWidth
    } catch {
      return false
    }
  }

  const getInstalledFonts = () => {
    const fontsList = ["Courier New", "Arial", "Times New Roman", "Helvetica", "Verdana", "Georgia", "Comic Sans MS", "Trebuchet MS", "Impact"]
    return fontsList.filter(f => checkFont(f))
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

  const startAnalysis = async () => {
    setLoading(true)
    setProgress(15)
    setError("")
    
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 80 ? prev + 10 : prev))
    }, 200)

    try {
      const res = await fetch("/api/check")
      if (!res.ok) throw new Error("Failed to fetch diagnostics")
      const data = (await res.json()) as ConnectionReport
      clearInterval(timer)
      setProgress(85)
      
      // Parallelize client side scans
      await detectClientDetails()
      
      const canvasFP = getCanvasFingerprint()
      const webglFP = getWebGLFingerprint()
      const audioFP = await getAudioFingerprint()
      const fontsInstalled = getInstalledFonts()

      await Promise.all([
        scanWebRTC(data.ip, data.vpn || data.proxy || data.tor),
        runServiceChecks(data.vpn || data.proxy || data.tor)
      ])
      
      setFingerprintData({
        canvas: canvasFP.data || "Unsupported",
        webglVendor: webglFP.vendor,
        webglRenderer: webglFP.renderer,
        audio: audioFP.hash,
        fonts: fontsInstalled
      })

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

  const renderProgressBar = (score: number) => {
    const totalBlocks = 10
    const filledBlocks = Math.round((score / 100) * totalBlocks)
    const filled = "█".repeat(filledBlocks)
    const empty = "░".repeat(totalBlocks - filledBlocks)
    return <span className="font-mono tracking-tighter text-violet-500">{filled}<span className="text-zinc-300 dark:text-zinc-700">{empty}</span></span>
  }

  const getExposureLevelBadge = (level: "Safe" | "Minor" | "Medium" | "High" | "Critical") => {
    switch (level) {
      case "Safe":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">Safe</span>
      case "Minor":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-500/10 text-zinc-500 uppercase">Minor Exposure</span>
      case "Medium":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 uppercase">Medium Exposure</span>
      case "High":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500 uppercase">High Exposure</span>
      case "Critical":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-600/20 text-red-500 animate-pulse border border-red-500/30 uppercase">Critical</span>
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans relative overflow-hidden pb-12 ${
      isDark ? "bg-[#09090b] text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.10]"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(circle at 1px 1px, #52525b 1px, transparent 0)"
            : "radial-gradient(circle at 1px 1px, #a1a1aa 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col h-screen max-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6 h-10 shrink-0">
          <div className="flex items-center gap-2">
            <span 
              className="font-black text-xl tracking-tight bg-gradient-to-r bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, ${branding.primary_color || '#8b5cf6'}, ${branding.accent_color || '#6366f1'})` }}
            >
              {branding.name.toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`p-2 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 shadow-sm"
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
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
              className="flex-1 flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full border border-dashed animate-[spin_20s_linear_infinite] ${isDark ? "border-zinc-800" : "border-zinc-300"}`} />
                <div className={`w-16 h-16 rounded-full border flex items-center justify-center shadow-md relative ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <Compass className="w-5 h-5 text-violet-500 animate-spin" />
                </div>
              </div>
              <div className="text-center w-64 space-y-3">
                <div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? "bg-zinc-900" : "bg-zinc-200"}`}>
                  <motion.div className="h-full bg-violet-500" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
                </div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Auditing Privacy Profile...</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-16"
            >
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <h2 className="text-lg font-bold">Audit Failed</h2>
              <p className="text-zinc-500 text-xs max-w-sm">{error}</p>
              <button onClick={startAnalysis} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Restart Audit
              </button>
            </motion.div>
          ) : report ? (
            <motion.div 
              key="results" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4 }} 
              className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden"
            >
              
              {/* LEFT COLUMN - STICKY (overall score, inferences, exposure chips) */}
              <div className="lg:col-span-5 flex flex-col space-y-4 min-h-0 overflow-y-auto lg:pr-1 pb-4 scrollbar-none shrink-0">
                
                {/* 1. Privacy & Security Score Card */}
                <div className={`rounded-xl border p-5 flex items-center gap-5 ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="flex items-baseline font-black leading-none text-zinc-900 dark:text-zinc-100">
                      <span className="text-5xl tracking-tighter">{report.score}</span>
                      <span className="text-sm text-zinc-400 dark:text-zinc-600 font-normal">/100</span>
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider mt-1.5 text-zinc-500">
                      {report.status}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <h3 className="font-bold text-sm tracking-tight text-violet-500 uppercase flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Privacy & Security Score
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-normal">{report.summary}</p>
                    <div className="pt-1">{renderProgressBar(report.score)}</div>
                  </div>
                </div>

                {/* 2. What We Believe About You Panel */}
                <div className={`rounded-xl border p-5 space-y-4 ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" /> What We Believe About You
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-semibold">This is what a website can reasonably infer about you.</p>
                  </div>
                  
                  <div className="space-y-2 text-xs font-semibold">
                    {[
                      { label: "Name", val: "Unknown", conf: 99, status: "✓ Better Privacy", color: "text-emerald-500" },
                      { label: "Country", val: report.country || "Unknown", conf: report.country_code ? 99 : 0 },
                      { label: "City", val: report.city || "Unknown", conf: report.city ? 95 : 0 },
                      { label: "District", val: report.region || "Unknown", conf: report.region ? 72 : 0 },
                      { label: "ISP / Carrier", val: report.isp || "Unknown", conf: report.isp ? 100 : 0 },
                      { label: "Timezone", val: report.timezone || "Unknown", conf: report.timezone ? 100 : 0 },
                      { label: "Language", val: detectedBrowser.language, conf: 90 },
                      { label: "Operating System", val: detectedBrowser.os, conf: 96 },
                      { label: "Browser", val: detectedBrowser.name, conf: 99 },
                      { label: "VPN", val: report.vpn ? "Detected" : "Not Detected", conf: 94 },
                      { label: "Residential Line", val: report.residential ? "Yes" : "No", conf: 91 },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500">{item.label}</span>
                          <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <span>{item.val}</span>
                            {item.status ? (
                              <span className={`text-[9px] font-bold uppercase ${item.color}`}>{item.status}</span>
                            ) : (
                              <span className="text-[9px] text-zinc-400 font-mono">({item.conf}%)</span>
                            )}
                          </span>
                        </div>
                        {item.conf > 0 && !item.status && (
                          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                item.conf >= 90 ? "bg-emerald-500" : item.conf >= 70 ? "bg-violet-500" : "bg-amber-500"
                              }`} 
                              style={{ width: `${item.conf}%` }} 
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Exposure Summary Chips */}
                <div className={`rounded-xl border p-5 space-y-4 ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-violet-500">Exposed Parameters</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold">Exposed tracking markers classified by visibility.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Public IP", level: "Visible" },
                      { label: "ISP", level: "Visible" },
                      { label: "ASN", level: "Visible" },
                      { label: "Approx. Location", level: "Visible" },
                      { label: "Browser Info", level: "Visible" },
                      { label: "OS details", level: "Visible" },
                      { label: "Screen Resolution", level: "Visible" },
                      { label: "Language", level: "Visible" },
                      { label: "Timezone", level: "Visible" },
                      { label: "Canvas Hash", level: "Partially" },
                      { label: "WebGL Renderer", level: "Partially" },
                      { label: "Audio Hash", level: "Partially" },
                      { label: "Hardware Threads", level: "Visible" },
                      { label: "Device Memory", level: "Visible" },
                      { label: "Cookies Status", level: "Visible" },
                      { label: "Local IP", level: webRTCData.status === "Leak" || webRTCData.status === "Partial" ? "Visible" : "Hidden" },
                    ].map((chip, idx) => (
                      <span 
                        key={idx} 
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          chip.level === "Hidden"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                            : chip.level === "Partially"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                              : "bg-zinc-500/10 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {chip.level === "Hidden" ? "✓" : chip.level === "Partially" ? "⚠" : "✗"} {chip.label}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN - SCROLLABLE EXPANDABLE CARD STACK */}
              <div className="lg:col-span-7 flex flex-col space-y-3 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin">
                
                {/* 1. NETWORK PRIVACY */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("network")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["network"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <EyeOff className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Network Privacy</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          {report.vpn ? "Routed through VPN / Anonymizer" : "ISP Direct Routing"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.network ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.network ?? 100}/100
                      </span>
                      {getExposureLevelBadge(report.tor ? "High" : report.proxy ? "Medium" : report.hosting ? "Minor" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["network"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["network"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-zinc-500 block mb-0.5">VPN Detected</span><span className="font-bold">{report.vpn ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Tor Exit Node</span><span className="font-bold">{report.tor ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Proxy Active</span><span className="font-bold">{report.proxy ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Hosting/Datacenter IP</span><span className="font-bold">{report.hosting ? "Yes" : "No (Residential/Mobile)"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">ASN Type</span><span className="font-bold uppercase font-mono">{report.asn_type || "Residential"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">ISP Carrier Class</span><span className="font-bold">{report.carrier_class || "Broadband"}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          {report.tor 
                            ? "Tor exit nodes provide high anonymity but are widely blocked by large services. Use a high-quality residential VPN for everyday auditing." 
                            : report.vpn 
                              ? "VPN is active. Your network privacy is protected from local ISP logging. Ensure no leaks are active." 
                              : "No VPN detected. Your ISP and local routers log all visited domains. Route through a trusted VPN to secure your traffic."}
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify({ vpn: report.vpn, tor: report.tor, proxy: report.proxy, hosting: report.hosting, asn_type: report.asn_type, carrier_class: report.carrier_class, ip_risk: report.risk_score }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* 2. DNS SECURITY */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("dns")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["dns"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">DNS Security</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          {report.dns_leak === "Leak" ? "DNS Leaks Detected" : "DNS Queries Protected"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.dns ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.dns ?? 100}/100
                      </span>
                      {getExposureLevelBadge(report.dns_leak === "Leak" ? "Critical" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["dns"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["dns"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-zinc-500 block mb-0.5">DNS Provider</span><span className="font-bold truncate block">{report.isp}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Resolver Country</span><span className="font-bold">{report.country}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Expected Country</span><span className="font-bold">{report.country}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Leak Status</span><span className={`font-bold ${report.dns_leak === "Leak" ? "text-red-500" : "text-emerald-500"}`}>{report.dns_leak === "Leak" ? "Leak Detected" : "No Leak"}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          {report.dns_leak === "Leak" 
                            ? "Critical! Your browser is bypassing the VPN's DNS tunnel and querying local ISP resolvers. Change your VPN client settings to force DNS leak protection or enable DNS-over-HTTPS (DoH)." 
                            : "Protected. Your DNS resolves match your public connection routing. No leaks detected."}
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify({ dns_leak: report.dns_leak, resolver: report.isp, country: report.country }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* 3. WEBRTC PROTECTION */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("webrtc")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["webrtc"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wifi className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">WebRTC Protection</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          {webRTCData.status === "Leak" ? "WebRTC Public IP Leaked" : webRTCData.status === "Partial" ? "Local Candidates Exposed" : "WebRTC Protected"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.webrtc ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.webrtc ?? 100}/100
                      </span>
                      {getExposureLevelBadge(webRTCData.status === "Leak" ? "Critical" : webRTCData.status === "Partial" ? "Minor" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["webrtc"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["webrtc"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-zinc-500 block mb-0.5">WebRTC Active</span><span className="font-bold">{webRTCData.status !== "Unsupported" ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">mDNS Masking</span><span className="font-bold">{webRTCData.mdnsEnabled ? "Enabled" : "Disabled"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Private Candidates</span><span className="font-bold truncate block">{webRTCData.localIPv4.concat(webRTCData.localIPv6).join(", ") || "Hidden"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Public Candidates</span><span className="font-bold truncate block">{webRTCData.publicIPs.join(", ") || "Hidden"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">STUN Servers Queried</span><span className="font-bold">4 Servers</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">CGNAT Loopback</span><span className="font-bold">{webRTCData.cgnat ? "CGNAT Range Detected" : "No CGNAT Detected"}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          {webRTCData.status === "Leak"
                            ? "Critical Leak! WebRTC is bypassing the VPN proxy and exposing your real public IP. Turn off WebRTC in your browser config or use a WebRTC protection extension." 
                            : webRTCData.status === "Partial"
                              ? "Partial Exposure. Your local IP address is exposed. Although not a critical threat, this assists websites in fingerprinting. Enable mDNS masking in browser flags."
                              : "Safe. WebRTC public IP candidates are correctly hidden."}
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify(webRTCData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* 4. BROWSER FINGERPRINT & TRACKING */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("fingerprint")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["fingerprint"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Browser Fingerprint</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          Fingerprint Risk: Medium
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.fingerprint ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.fingerprint ?? 100}/100
                      </span>
                      {getExposureLevelBadge("Medium")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["fingerprint"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["fingerprint"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-zinc-500 block mb-0.5">Canvas Hash</span><span className="font-bold font-mono text-[10px] truncate block">{fingerprintData.canvas}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">WebGL Vendor</span><span className="font-bold truncate block">{fingerprintData.webglVendor}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block mb-0.5">WebGL Renderer</span><span className="font-bold truncate block">{fingerprintData.webglRenderer}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Audio Fingerprint</span><span className="font-bold font-mono text-[10px] truncate block">{fingerprintData.audio}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Fonts Probed</span><span className="font-bold truncate block">{fingerprintData.fonts.length} Fonts Detected</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Hardware Threads</span><span className="font-bold">{navigator.hardwareConcurrency || "N/A"} Cores</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Device Memory</span><span className="font-bold">{(navigator as any).deviceMemory || "N/A"} GB</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          Canvas and WebGL parameters can uniquely profile your browser. For advanced tracking protection, use browsers with built-in randomization/fingerprint resistance such as Brave or Firefox (with RFP enabled).
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify({ canvas: fingerprintData.canvas, webglVendor: fingerprintData.webglVendor, webglRenderer: fingerprintData.webglRenderer, audio: fingerprintData.audio, fonts: fingerprintData.fonts, cores: navigator.hardwareConcurrency, memory: (navigator as any).deviceMemory }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* 5. CONNECTION SECURITY & TLS */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("security")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["security"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Encryption & TLS</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          {report.https ? `HTTPS Encryption - ${report.tls_version || "TLS 1.3"}` : "Unencrypted Connection"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.security ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.security ?? 100}/100
                      </span>
                      {getExposureLevelBadge(report.https ? "Safe" : "Critical")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["security"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["security"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-zinc-500 block mb-0.5">HTTPS Enforced</span><span className="font-bold">{report.https ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">TLS version</span><span className="font-bold">{report.tls_version || "None"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">HTTP Protocol</span><span className="font-bold">{report.http_version || "HTTP/1.1"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">HSTS Configuration</span><span className="font-bold">{report.hsts ? "Enabled" : "Disabled"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">OCSP Stapling</span><span className="font-bold">{report.ocsp_stapling ? "Active" : "Inactive"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Forward Secrecy (PFS)</span><span className="font-bold">{report.pfs ? "Supported" : "No"}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block mb-0.5">Cipher Suite</span><span className="font-bold font-mono text-[10px] break-all leading-normal">{report.cipher_suite || "N/A"}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block mb-0.5">Certificate Issuer</span><span className="font-bold truncate block">{report.cert_issuer || "N/A"}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block mb-0.5">Certificate Expiry</span><span className="font-bold">{report.cert_expiration || "N/A"}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          {report.https 
                            ? "Your session is fully encrypted over HTTPS. Secure headers (HSTS) protect against downgrade attacks." 
                            : "Avoid cleartext sessions! Configure HTTPS on your web servers immediately."}
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify({ https: report.https, tls: report.tls_version, cipher: report.cipher_suite, alpn: report.alpn, hsts: report.hsts, ocsp: report.ocsp_stapling, pfs: report.pfs, issuer: report.cert_issuer, expires: report.cert_expiration }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* 6. IP REPUTATION & BLACKLISTS */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("reputation")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["reputation"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">IP Reputation</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          Fraud Risk: {report.risk_score}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.reputation ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.reputation ?? 100}/100
                      </span>
                      {getExposureLevelBadge(report.risk_score > 70 ? "High" : report.risk_score > 30 ? "Medium" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["reputation"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["reputation"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-zinc-500 block mb-0.5">Risk Score</span><span className="font-bold font-mono">{report.risk_score}%</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Blacklist Status</span><span className="font-bold">{report.risk_score > 40 ? "Listed" : "Clean"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Reported Activities</span><span className="font-bold">{report.risk_score > 20 ? "Elevated Scanning/Spam flags" : "None"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Network Security Index</span><span className="font-bold">{100 - report.risk_score}%</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          {report.risk_score > 35 
                            ? "This IP address is flagged as suspicious. Some Cloudflare protected websites or payment gateways may prompt you with CAPTCHAs. Consider routing your traffic through another VPN server." 
                            : "Safe. Your IP has a clean reputation."}
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify({ risk_score: report.risk_score, hosting: report.hosting, anonymous: report.anonymous, blacklisted: report.risk_score > 40 }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* 7. SERVICE & PLATFORM COMPATIBILITY */}
                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDark ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div 
                    onClick={() => toggleCard("compatibility")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["compatibility"] ? (isDark ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Service Compatibility</h4>
                        <p className="text-[10px] text-zinc-500 font-semibold">
                          AI & Streaming Access Audit
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">
                        {renderProgressBar(report.score_breakdown?.compatibility ?? 100)}
                      </span>
                      <span className="font-mono min-w-10">
                        {report.score_breakdown?.compatibility ?? 100}/100
                      </span>
                      {getExposureLevelBadge(report.vpn ? "Minor" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        expandedCards["compatibility"] ? "rotate-180" : ""
                      }`} />
                    </div>
                  </div>

                  {expandedCards["compatibility"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {/* AI platforms */}
                        <div>
                          <span className="text-violet-500 font-bold uppercase text-[9px] tracking-wider block mb-2">AI Platforms</span>
                          <div className="space-y-2">
                            {["ChatGPT", "Gemini", "Claude", "Copilot"].map(svc => (
                              <div key={svc} className="flex justify-between items-center">
                                <span className="text-zinc-500 font-semibold">{svc}</span>
                                <span className={`font-bold ${
                                  serviceStatuses[svc] === "Accessible" || serviceStatuses[svc] === "Reachable"
                                    ? "text-emerald-500"
                                    : "text-amber-500"
                                }`}>
                                  {serviceStatuses[svc] || "Testing..."}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Streaming platforms */}
                        <div>
                          <span className="text-violet-500 font-bold uppercase text-[9px] tracking-wider block mb-2">Streaming Platforms</span>
                          <div className="space-y-2">
                            {["Netflix", "Spotify", "Disney+", "Prime"].map(svc => (
                              <div key={svc} className="flex justify-between items-center">
                                <span className="text-zinc-500 font-semibold">{svc}</span>
                                <span className={`font-bold ${
                                  serviceStatuses[svc] === "Accessible" || serviceStatuses[svc] === "Reachable"
                                    ? "text-emerald-500"
                                    : "text-amber-500"
                                }`}>
                                  {serviceStatuses[svc] || "Testing..."}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                        <span className="text-violet-500 font-bold uppercase text-[10px] tracking-wider block">Auditor Recommendation</span>
                        <p className="text-zinc-500">
                          {report.vpn 
                            ? "Your anonymized connection might encounter login or streaming blocks on Netflix/ChatGPT due to public IP flag pools. Keep VPN active but switch nodes if blocks occur." 
                            : "Your connection has direct access compatibility since it is residential."}
                        </p>
                      </div>

                      <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                        <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                          <span>TECHNICAL DETAILS</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-2">
                          <pre className="text-[10px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                            {JSON.stringify({ serviceStatuses, backendServices: report.services }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-auto pt-6 text-center text-[9px] font-bold tracking-wider uppercase border-t border-zinc-200 dark:border-zinc-900 text-zinc-500 shrink-0 h-16">
          <div>
            &copy; {new Date().getFullYear()} {branding.copyright_text || branding.name}. {branding.footer_text}
          </div>
          <div className="flex justify-center gap-4 mt-2 normal-case font-semibold text-zinc-500 text-xs">
            {branding.support_url && <a href={branding.support_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">Support</a>}
            {branding.github_url && <a href={branding.github_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">GitHub</a>}
            {branding.documentation_url && <a href={branding.documentation_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">Docs</a>}
          </div>
        </footer>

      </div>
    </div>
  )
}
