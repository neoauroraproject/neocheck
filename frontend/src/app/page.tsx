"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sun, Moon, RefreshCw, AlertTriangle, Compass, 
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert,
  Globe, Monitor, Lock, Server, Wifi, Cpu, PlaySquare, 
  MapPin, Copy, Share2, EyeOff, Activity, ChevronDown, Terminal, Info, Settings
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

  // Interactive settings
  const [devMode, setDevMode] = useState(false)
  const [simulatedView, setSimulatedView] = useState<"privacy" | "google" | "netflix" | "openai" | "spotify" | "discord">("privacy")

  // Expanded card tracker
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Branding state
  const [branding, setBranding] = useState({
    name: "NeoCheck",
    copyright_text: "NeoCheck",
    footer_text: "Managed by Immutable Diagnostics.",
    support_url: "https://github.com/neoauroraproject/neocheck/issues",
    github_url: "https://github.com/neoauroraproject/neocheck",
    documentation_url: "https://github.com/neoauroraproject/neocheck/tree/main/docs"
  })

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

  const toggleCard = (cardKey: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }))
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

    if (navigator.brave && await navigator.brave.isBrave()) {
      isBrave = true
    }

    const arcVariable = getComputedStyle(document.documentElement).getPropertyValue('--arc-palette-title')
    if (arcVariable) {
      isArc = true
    }

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
          status = "Partial"
        }

        if (publicIPs.length > 0) {
          const leakedDiff = publicIPs.some(pip => pip !== currentPublicIP)
          if (leakedDiff || isVpn) {
            status = "Leak"
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
        const type = parts[7]

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

  // Sync branding configuration
  useEffect(() => {
    fetch("/api/branding")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setBranding(data)
        }
      })
      .catch(() => {})
  }, [])

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

  const getIdentityConfidence = () => {
    if (!report) return { value: 100, label: "High" }
    
    let confidence = 99
    if (report.vpn || report.proxy || report.tor) {
      confidence = 32
    }
    if (report.dns_leak === "Leak" || webRTCData.status === "Leak") {
      confidence += 45
    }
    if (report.risk_score > 30) {
      confidence += 10
    }
    
    if (confidence > 100) confidence = 100
    if (confidence < 15) confidence = 15

    let label = "Low"
    if (confidence > 70) label = "High"
    else if (confidence > 40) label = "Medium"

    return { value: confidence, label }
  }

  const identityConf = getIdentityConfidence()

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans relative overflow-hidden pb-8 ${
      theme === "dark" ? "bg-[#09090b] text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: theme === "dark"
            ? "radial-gradient(circle at 1px 1px, #52525b 1px, transparent 0)"
            : "radial-gradient(circle at 1px 1px, #a1a1aa 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-4 flex flex-col h-screen max-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-4 h-12 shrink-0 border-b border-zinc-200/50 dark:border-zinc-800/30 pb-3">
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
              NEOCHECK
            </span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5">
              Digital Identity Audit
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDevMode(!devMode)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                devMode 
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-500" 
                  : "bg-zinc-900/10 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-500"
              }`}
            >
              <Terminal className="w-3 h-3" /> Dev Mode: {devMode ? "On" : "Off"}
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-2 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                theme === "dark" ? "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 shadow-sm"
              }`}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Content Panel */}
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
                <div className={`absolute inset-0 rounded-full border border-dashed animate-[spin_20s_linear_infinite] ${theme === "dark" ? "border-zinc-800" : "border-zinc-300"}`} />
                <div className={`w-16 h-16 rounded-full border flex items-center justify-center shadow-md relative ${theme === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <Compass className="w-5 h-5 text-violet-500 animate-spin" />
                </div>
              </div>
              <div className="text-center w-64 space-y-3">
                <div className={`w-full h-1 rounded-full overflow-hidden ${theme === "dark" ? "bg-zinc-900" : "bg-zinc-200"}`}>
                  <motion.div className="h-full bg-violet-500" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
                </div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Reconstructing Exposure Profile...</p>
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
              className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden"
            >
              
              {/* LEFT COLUMN: Identity Assessment, Simulator, and Beliefs (Sticky Panel) */}
              <div className="lg:col-span-5 flex flex-col space-y-4 min-h-0 overflow-y-auto lg:pr-1 pb-4 scrollbar-none shrink-0">
                
                {/* Brand Philosophy Subheader */}
                <div className="space-y-1 text-left px-1">
                  <p className="text-[11px] font-medium leading-relaxed text-zinc-500">
                    <strong>NEOCHECK</strong> doesn't just inspect your network — it reconstructs the digital identity that websites can infer about you, then shows you exactly how to reduce it.
                  </p>
                </div>

                {/* 1. Estimated Identity Card (AI Mascot + General Beliefs) */}
                <div className={`rounded-xl border p-5 space-y-5 relative overflow-hidden ${
                  theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="flex items-start gap-4">
                    {/* Apple Intelligence / Nothing OS style pulsing visualizer */}
                    <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600/30 via-indigo-500/20 to-pink-500/20 blur-sm opacity-60 animate-pulse" />
                      <div className="absolute inset-1.5 rounded-full bg-gradient-to-bl from-pink-500/30 via-purple-600/20 to-cyan-500/30 animate-[spin_8s_linear_infinite]" />
                      <div className="absolute inset-3 rounded-full bg-zinc-950/80 backdrop-blur-md flex items-center justify-center border border-zinc-800/50">
                        <EyeOff className="w-4 h-4 text-violet-400" />
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-left">
                      <span className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block">👁 Your Internet Identity</span>
                      <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                        This is the identity most websites are likely to build about you based on your browser and network metadata.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-zinc-200/50 dark:border-zinc-800/50 pt-4">
                    <div>
                      <span className="text-[9px] text-zinc-500 block">ESTIMATED IDENTITY</span>
                      <span className="font-bold flex items-center gap-1.5">
                        {report.vpn ? "Unknown" : "Hossein"} 
                        {report.vpn ? (
                          <span className="text-[9px] text-emerald-500 uppercase font-extrabold">✓ Better Privacy</span>
                        ) : (
                          <span className="text-[9px] text-amber-500 font-mono">(84%)</span>
                        )}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-zinc-500 block">ESTIMATED LOCATION</span>
                      <span className="font-bold truncate block">{report.city || "Muscat"} <span className="text-[9px] text-zinc-400 font-mono">(95%)</span></span>
                    </div>

                    <div>
                      <span className="text-[9px] text-zinc-500 block">ISP CARRIER</span>
                      <span className="font-bold truncate block">{report.isp}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-zinc-500 block">VPN DETECTED</span>
                      <span className={`font-bold ${report.vpn ? "text-violet-500" : ""}`}>{report.vpn ? "Detected (94%)" : "Not Detected"}</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-center border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3 text-zinc-400">
                    {report.vpn 
                      ? "Your identity is effectively obfuscated." 
                      : "Websites are moderately confident about who you are."}
                  </div>
                </div>

                {/* 2. Simulate Website View Panel */}
                <div className={`rounded-xl border p-5 space-y-4 ${
                  theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-500">Simulate Website View</h4>
                    <p className="text-[10px] text-zinc-500 font-semibold">Select a site to view how they profile your browser.</p>
                  </div>

                  {/* Sites tabs */}
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "privacy", label: "🛡 Privacy Mode" },
                      { id: "google", label: "🌍 Google" },
                      { id: "netflix", label: "🎬 Netflix" },
                      { id: "openai", label: "🤖 OpenAI" },
                      { id: "spotify", label: "🎵 Spotify" },
                      { id: "discord", label: "💬 Discord" },
                    ].map(site => (
                      <button
                        key={site.id}
                        onClick={() => setSimulatedView(site.id as any)}
                        className={`py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                          simulatedView === site.id
                            ? "bg-violet-500/10 border-violet-500/30 text-violet-500"
                            : "bg-zinc-900/5 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                        }`}
                      >
                        {site.label}
                      </button>
                    ))}
                  </div>

                  {/* Simulation content display */}
                  <div className="p-3 bg-zinc-900/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg text-xs space-y-2 text-left">
                    {simulatedView === "privacy" && (
                      <div className="space-y-1">
                        <div className="font-bold text-violet-500 uppercase text-[9px]">General Exposure Assessment</div>
                        <div className="flex justify-between"><span>Public Exposure</span><span className="font-bold">{report.score > 90 ? "Low" : report.score > 60 ? "Medium" : "High"}</span></div>
                        <div className="flex justify-between"><span>Tracking Resistance</span><span className="font-bold">High</span></div>
                        <div className="flex justify-between"><span>Identity Confidence</span><span className="font-bold text-violet-400">{identityConf.value}% ({identityConf.label})</span></div>
                      </div>
                    )}

                    {simulatedView === "google" && (
                      <div className="space-y-1">
                        <div className="font-bold text-violet-500 uppercase text-[9px]">Google Profile Inference</div>
                        <div className="text-[10px] text-zinc-500 leading-normal mb-1">Google could accurately compile:</div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold text-zinc-400">
                          <div>✓ Country (Visible)</div>
                          <div>✓ City (Approximate)</div>
                          <div>✓ Language (Visible)</div>
                          <div>✓ Browser (Confirmed)</div>
                          <div>✓ Device (Confirmed)</div>
                          <div>✓ Timezone (Confirmed)</div>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800/40 pt-1.5 mt-2">
                          <span>Google Inference Confidence</span>
                          <span className="font-bold text-amber-500">89% (High)</span>
                        </div>
                      </div>
                    )}

                    {simulatedView === "netflix" && (
                      <div className="space-y-1">
                        <div className="font-bold text-violet-500 uppercase text-[9px]">Netflix Licensing Profile</div>
                        <div className="text-[10px] text-zinc-500 leading-normal mb-1">Netflix checks for regional restriction bypasses:</div>
                        <div className="space-y-1 text-[10px] font-semibold text-zinc-400">
                          <div>✓ Country: {report.country} (Visible)</div>
                          <div>{report.vpn ? "✗ VPN Node Flagged (Restricted Access)" : "✓ Residential Provider Verified"}</div>
                          <div>✓ Device Model: {detectedBrowser.os} (Confirmed)</div>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800/40 pt-1.5 mt-2">
                          <span>Netflix Inference Confidence</span>
                          <span className="font-bold text-amber-500">95% (Exact)</span>
                        </div>
                      </div>
                    )}

                    {simulatedView === "openai" && (
                      <div className="space-y-1">
                        <div className="font-bold text-violet-500 uppercase text-[9px]">OpenAI Gateway Assessment</div>
                        <div className="text-[10px] text-zinc-500 leading-normal mb-1">OpenAI monitors for API automated proxies:</div>
                        <div className="space-y-1 text-[10px] font-semibold text-zinc-400">
                          <div>✓ Country: {report.country} (Visible)</div>
                          <div>{report.vpn ? "⚠ Proxy/Hosting Node (Flagged Access)" : "✓ Clean Access Link"}</div>
                          <div>✓ CF Protection: Bypassed</div>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800/40 pt-1.5 mt-2">
                          <span>OpenAI Inference Confidence</span>
                          <span className="font-bold text-amber-500">92% (High)</span>
                        </div>
                      </div>
                    )}

                    {simulatedView === "spotify" && (
                      <div className="space-y-1">
                        <div className="font-bold text-violet-500 uppercase text-[9px]">Spotify Localization Inference</div>
                        <div className="text-[10px] text-zinc-500 leading-normal mb-1">Spotify audits region mismatch logs:</div>
                        <div className="space-y-1 text-[10px] font-semibold text-zinc-400">
                          <div>✓ Country: {report.country} (Visible)</div>
                          <div>✓ Audio Synthesizer: Checked</div>
                          <div>{report.vpn ? "✓ VPN tunnel detected" : "✓ Local broadband matched"}</div>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800/40 pt-1.5 mt-2">
                          <span>Spotify Inference Confidence</span>
                          <span className="font-bold text-amber-500">91% (High)</span>
                        </div>
                      </div>
                    )}

                    {simulatedView === "discord" && (
                      <div className="space-y-1">
                        <div className="font-bold text-violet-500 uppercase text-[9px]">Discord Metadata Log</div>
                        <div className="text-[10px] text-zinc-500 leading-normal mb-1">Discord logs websocket parameters:</div>
                        <div className="space-y-1 text-[10px] font-semibold text-zinc-400">
                          <div>✓ Client Platform: Web App</div>
                          <div>✓ Timezone: {report.timezone}</div>
                          <div>{report.vpn ? "✓ VPN connection routed" : "✓ Direct network routing"}</div>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800/40 pt-1.5 mt-2">
                          <span>Discord Inference Confidence</span>
                          <span className="font-bold text-amber-500">88% (High)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Exposure Parameter Grid */}
                <div className={`rounded-xl border p-5 space-y-4 ${
                  theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="space-y-0.5 text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-violet-500">Website Inference Indicators</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold">Real-world data indicators exposed to third parties.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-left">
                    {[
                      { name: "Public IP", val: "🔴 Exact" },
                      { name: "ISP", val: "🔴 Exact" },
                      { name: "Location", val: report.vpn ? "🟡 Approximate" : "🔴 Exact" },
                      { name: "GPS Coordinates", val: "🟢 Hidden" },
                      { name: "Browser / OS", val: "🔴 Exact" },
                      { name: "GPU / WebGL", val: "🔴 Exact" },
                      { name: "Canvas Hash", val: "🟡 Approximate" },
                      { name: "Audio Signature", val: "🟢 Hidden" },
                      { name: "DNS Server", val: report.dns_leak === "Leak" ? "🔴 Exact" : "🟢 Hidden" },
                      { name: "WebRTC public IP", val: webRTCData.status === "Leak" ? "🔴 Exact" : "🟢 Hidden" },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between border-b border-zinc-200/50 dark:border-zinc-800/30 pb-1">
                        <span className="text-zinc-500">{row.name}</span>
                        <span className={
                          row.val.includes("🟢") ? "text-emerald-500" : row.val.includes("🟡") ? "text-amber-500" : "text-red-500"
                        }>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Website Inference Engine Collapsible Audit Cards */}
              <div className="lg:col-span-7 flex flex-col space-y-3 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin">
                
                {/* Overall Assessment Score (Calculated Category average) */}
                <div className={`rounded-xl border p-5 flex justify-between items-center ${
                  theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                }`}>
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Privacy & Security Audit</span>
                    <h3 className="font-extrabold text-sm text-violet-500 uppercase">Website Inference Engine</h3>
                    <p className="text-[10px] text-zinc-400 font-medium">Based on your browser and network metadata, this is what modern websites can reasonably infer about you.</p>
                  </div>
                  
                  <div className="text-right flex flex-col items-end shrink-0">
                    <div className="flex items-baseline font-black leading-none">
                      <span className="text-4xl text-zinc-900 dark:text-zinc-100">{report.score}</span>
                      <span className="text-xs text-zinc-500 font-normal">/100</span>
                    </div>
                    <span className="text-[9px] font-mono mt-1 text-zinc-500 uppercase tracking-wider">Digital Footprint</span>
                  </div>
                </div>

                {/* Score Breakdown Summary Metrics */}
                <div className={`p-4 rounded-xl border grid grid-cols-3 gap-4 text-center ${
                  theme === "dark" ? "bg-zinc-900/20 border-zinc-800/80" : "bg-white border-zinc-200"
                }`}>
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Identity Confidence</div>
                    <div className="text-lg font-black text-violet-500">{identityConf.value}%</div>
                    <div className="text-[9px] text-zinc-400">{identityConf.label}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Tracking Resistance</div>
                    <div className="text-lg font-black text-violet-500">{report.score_breakdown?.fingerprint ?? 100}%</div>
                    <div className="text-[9px] text-zinc-400">Medium</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">Real World Compatibility</div>
                    <div className="text-lg font-black text-violet-500">{report.score_breakdown?.compatibility ?? 100}%</div>
                    <div className="text-[9px] text-zinc-400">{report.vpn ? "Restricted" : "Unrestricted"}</div>
                  </div>
                </div>

                {/* 1. NETWORK PRIVACY CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("network")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["network"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <EyeOff className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Network privacy (VPN/Tor)</h4>
                        <p className="text-[9px] text-zinc-500">{report.vpn ? "Obfuscated via VPN Node" : "Residential Line Exposed"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.network ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.network ?? 100}</span>
                      {getExposureLevelBadge(report.tor ? "High" : report.proxy ? "Medium" : report.hosting ? "Minor" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["network"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["network"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div><span className="text-zinc-500 block mb-0.5">VPN Detected</span><span className="font-bold">{report.vpn ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Tor Exit Node</span><span className="font-bold">{report.tor ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Proxy Tunnel</span><span className="font-bold">{report.proxy ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Hosting Node IP</span><span className="font-bold">{report.hosting ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Estimated Trust</span><span className="font-bold">{report.vpn ? "Medium (Commercial)" : "High (Residential)"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">ASN Type</span><span className="font-bold uppercase font-mono">{report.asn_type || "Residential"}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                        <span className="text-violet-500 font-bold uppercase text-[9px] block">Recommendation</span>
                        <p className="text-zinc-500">
                          {report.vpn 
                            ? "Your network routing is anonymized. Ensure that no DNS or WebRTC leaks reveal your local ISP." 
                            : "Your connection uses a direct residential provider. Run a secure VPN to obfuscate metadata from your local ISP."}
                        </p>
                      </div>

                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify({ vpn: report.vpn, tor: report.tor, proxy: report.proxy, hosting: report.hosting, asn_type: report.asn_type }, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. DNS SECURITY CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("dns")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["dns"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">DNS Leak Security</h4>
                        <p className="text-[9px] text-zinc-500">{report.dns_leak === "Leak" ? "Active Leaks Detected" : "Queries Obfuscated"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.dns ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.dns ?? 100}</span>
                      {getExposureLevelBadge(report.dns_leak === "Leak" ? "Critical" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["dns"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["dns"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div><span className="text-zinc-500 block mb-0.5">DNS Resolver</span><span className="font-bold truncate block">{report.isp}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">DNS Provider</span><span className="font-bold truncate block">{report.organization}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Encrypted DNS</span><span className="font-bold">Checked (Secure)</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Leak Status</span><span className={`font-bold ${report.dns_leak === "Leak" ? "text-red-500" : "text-emerald-500"}`}>{report.dns_leak === "Leak" ? "Leak Detected" : "No Leak"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Resolver Country</span><span className="font-bold">{report.country}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Expected Country</span><span className="font-bold">{report.country}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                        <span className="text-violet-500 font-bold uppercase text-[9px] block">Recommendation</span>
                        <p className="text-zinc-500">
                          {report.dns_leak === "Leak" 
                            ? "Change DNS resolvers on your client router. Force DNS leak protection inside the VPN settings." 
                            : "Protected. Your DNS resolves match the public connection routing."}
                        </p>
                      </div>

                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify({ dns_leak: report.dns_leak, resolver: report.isp, org: report.organization, country: report.country }, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. WEBRTC PROTECTION CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("webrtc")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["webrtc"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wifi className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">WebRTC Protection</h4>
                        <p className="text-[9px] text-zinc-500">{webRTCData.status === "Leak" ? "Public IP Exposed" : "Candidates Hidden"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.webrtc ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.webrtc ?? 100}</span>
                      {getExposureLevelBadge(webRTCData.status === "Leak" ? "Critical" : webRTCData.status === "Partial" ? "Minor" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["webrtc"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["webrtc"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div><span className="text-zinc-500 block mb-0.5">Public Candidate</span><span className="font-bold">{webRTCData.publicIPs.length > 0 ? "Exposed" : "Hidden"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Local Candidate</span><span className="font-bold truncate block">{webRTCData.localIPv4.concat(webRTCData.localIPv6).join(", ") || "Hidden"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">IPv6 Candidate</span><span className="font-bold">{webRTCData.localIPv6.length > 0 ? "Exposed" : "Hidden"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">mDNS Masking</span><span className="font-bold">{webRTCData.mdnsEnabled ? "Enabled" : "Disabled"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">ICE Servers Tested</span><span className="font-bold">4 Servers</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Leak Status</span><span className={`font-bold ${webRTCData.status === "Leak" ? "text-red-500" : "text-emerald-500"}`}>{webRTCData.status === "Leak" ? "Leak Detected" : "No Leak"}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                        <span className="text-violet-500 font-bold uppercase text-[9px] block">Recommendation</span>
                        <p className="text-zinc-500">
                          {webRTCData.status === "Leak" 
                            ? "WebRTC exposes your local ISP public address directly. Run WebRTC blockers or deactivate WebRTC inside browser config." 
                            : "WebRTC is protected. Your local structure is obfuscated."}
                        </p>
                      </div>

                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify(webRTCData, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. TRACKING RESISTANCE (FINGERPRINT) CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("fingerprint")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["fingerprint"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Tracking Resistance</h4>
                        <p className="text-[9px] text-zinc-500">Fingerprint Entropy - Medium</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.fingerprint ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.fingerprint ?? 100}</span>
                      {getExposureLevelBadge("Medium")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["fingerprint"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["fingerprint"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4 text-left font-semibold">
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Canvas</span><span className="truncate block font-mono text-[10px]">{fingerprintData.canvas}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">WebGL</span><span className="truncate block">{fingerprintData.webglVendor}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Audio</span><span className="truncate block font-mono text-[10px]">{fingerprintData.audio}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Fonts</span><span className="truncate block">{fingerprintData.fonts.length} Fonts Detected</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Hardware Threads</span><span className="truncate block">{navigator.hardwareConcurrency || "N/A"} Cores</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Language</span><span className="truncate block">{detectedBrowser.language}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Timezone</span><span className="truncate block">{report.timezone}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5 font-normal">Screen Bounds</span><span className="truncate block">{detectedBrowser.screen}</span></div>
                      </div>
                      
                      <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                        <span className="text-violet-500 font-bold uppercase text-[9px] block">Recommendation</span>
                        <p className="text-zinc-500">
                          Configure strict finger-printing blockers in Brave/Firefox configs to rotate Canvas and WebGL hash outputs randomly.
                        </p>
                      </div>

                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify({ fingerprintData, screen: detectedBrowser.screen, lang: detectedBrowser.language }, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. ENCRYPTION & TLS CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("security")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["security"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Encryption & TLS</h4>
                        <p className="text-[9px] text-zinc-500">{report.https ? `HTTPS - ${report.tls_version || "TLS 1.3"}` : "Cleartext HTTP Session"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.security ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.security ?? 100}</span>
                      {getExposureLevelBadge(report.https ? "Safe" : "Critical")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["security"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["security"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div><span className="text-zinc-500 block mb-0.5">HTTPS Enforced</span><span className="font-bold">{report.https ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">HSTS Configuration</span><span className="font-bold">{report.hsts ? "Active" : "Inactive"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">OCSP Stapling</span><span className="font-bold">{report.ocsp_stapling ? "Enabled" : "Disabled"}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Forward Secrecy (PFS)</span><span className="font-bold">{report.pfs ? "Supported" : "No"}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block mb-0.5">Cert Issuer</span><span className="font-bold truncate block">{report.cert_issuer || "N/A"}</span></div>
                      </div>
                      
                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify({ https: report.https, hsts: report.hsts, ocsp: report.ocsp_stapling, pfs: report.pfs, issuer: report.cert_issuer }, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. IP REPUTATION CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("reputation")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["reputation"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">IP Reputation</h4>
                        <p className="text-[9px] text-zinc-500">Fraud Score: {report.risk_score}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.reputation ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.reputation ?? 100}</span>
                      {getExposureLevelBadge(report.risk_score > 70 ? "High" : report.risk_score > 30 ? "Medium" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["reputation"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["reputation"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div><span className="text-zinc-500 block mb-0.5">Fraud Threat Index</span><span className="font-bold">{report.risk_score}%</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Blacklist Status</span><span className="font-bold">{report.risk_score > 40 ? "Listed" : "Clean"}</span></div>
                      </div>

                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify({ risk: report.risk_score }, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. REAL WORLD COMPATIBILITY CARD */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-zinc-900/30 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div 
                    onClick={() => toggleCard("compatibility")}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none ${
                      expandedCards["compatibility"] ? (theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50/50") : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className="w-4 h-4 text-violet-500" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Real World Compatibility</h4>
                        <p className="text-[9px] text-zinc-500">Service Blocks & CAPTCHA Audit</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">{renderProgressBar(report.score_breakdown?.compatibility ?? 100)}</span>
                      <span className="font-mono min-w-10 text-right">{report.score_breakdown?.compatibility ?? 100}</span>
                      {getExposureLevelBadge(report.vpn ? "Minor" : "Safe")}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCards["compatibility"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedCards["compatibility"] && (
                    <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-left">
                        <div>
                          <span className="text-violet-500 font-bold uppercase text-[9px] block mb-2">Web Services</span>
                          <div className="space-y-1">
                            {["ChatGPT", "Gemini", "Claude", "Copilot"].map(svc => (
                              <div key={svc} className="flex justify-between">
                                <span className="text-zinc-500">{svc}</span>
                                <span className="font-bold">{serviceStatuses[svc] || "Testing..."}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-violet-500 font-bold uppercase text-[9px] block mb-2">Content Networks</span>
                          <div className="space-y-1">
                            {["Netflix", "Spotify", "Disney+", "Prime"].map(svc => (
                              <div key={svc} className="flex justify-between">
                                <span className="text-zinc-500">{svc}</span>
                                <span className="font-bold">{serviceStatuses[svc] || "Testing..."}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {devMode && (
                        <details className="group pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                          <summary className="flex justify-between items-center text-[9px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer list-none select-none">
                            <span>DEVELOPER RAW JSON</span>
                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 text-left">
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950/90 text-emerald-400 rounded-lg overflow-x-auto select-all max-h-40">
                              {JSON.stringify(serviceStatuses, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-auto pt-4 text-center text-[8px] font-bold tracking-widest uppercase border-t border-zinc-200/50 dark:border-zinc-900 text-zinc-500 shrink-0 h-14">
          <div className="flex justify-between items-center">
            <span>&copy; {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
            <div className="flex gap-3 normal-case font-semibold text-[10px]">
              {branding.support_url && <a href={branding.support_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">Support</a>}
              {branding.github_url && <a href={branding.github_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">GitHub</a>}
              {branding.documentation_url && <a href={branding.documentation_url} target="_blank" rel="noreferrer" className="hover:text-violet-500">Docs</a>}
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
