"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sun, Moon, RefreshCw, AlertTriangle, Compass, 
  Check, Shield, EyeOff, ChevronDown, Terminal, Copy, Globe, Lock, Server, Wifi, Cpu, ShieldAlert, CheckCircle2, XCircle
} from "lucide-react"

// Types & Interfaces
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

// Simple dynamic score counter component
const ScoreCounter = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) {
      setCount(end)
      return
    }
    const duration = 1200
    const incrementTime = Math.max(Math.floor(duration / end), 12)
    const timer = setInterval(() => {
      start += 1
      setCount(start)
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      }
    }, incrementTime)
    return () => clearInterval(timer)
  }, [value])
  return <span>{count}</span>
}

export default function Home() {
  const [report, setReport] = useState<ConnectionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [flagUrl, setFlagUrl] = useState("")

  // Scan Timeline State
  const [scanStep, setScanStep] = useState(0)

  // Interactive settings
  const [devMode, setDevMode] = useState(false)
  const [simulatedView, setSimulatedView] = useState<"privacy" | "google" | "netflix" | "openai" | "spotify" | "discord">("privacy")

  // Expanded card tracker
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Branding configuration
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

  // WebRTC details
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

  // Service reachability results
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, "Reachable" | "Accessible" | "Blocked" | "Restricted" | "Network Accessible" | "Unknown">>({})
  
  // OS & Browser details
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

  // Load flag fallback
  useEffect(() => {
    if (report?.country_code) {
      setFlagUrl(`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${report.country_code.toLowerCase()}.svg`)
    }
  }, [report])

  // Canvas fingerprint check
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

  // WebGL vendor and renderer check
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

  // Audio fingerprint check
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
        gainNode.gain.value = 0 // Mute
        
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

  // OS & Browser detection
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

  // WebRTC ICE scanner
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

  // Reachability Probing
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

  // Fetch Branding details
  useEffect(() => {
    fetch("/api/branding")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setBranding(data)
      })
      .catch(() => {})
  }, [])

  // Start sequential scans & fetching
  const startAnalysis = async () => {
    setLoading(true)
    setError("")
    setScanStep(0)
    
    // Animate scan sequence timing
    const stepInterval = setInterval(() => {
      setScanStep((prev) => {
        if (prev >= 3) {
          clearInterval(stepInterval)
          return 3
        }
        return prev + 1
      })
    }, 650)

    try {
      const res = await fetch("/api/check")
      if (!res.ok) throw new Error("Failed to fetch diagnostics")
      const data = (await res.json()) as ConnectionReport
      
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

      // Wait a little so the scan animations finish gracefully
      setTimeout(() => {
        setReport(data)
        setLoading(false)
      }, 2000)
    } catch {
      clearInterval(stepInterval)
      setError("Unable to resolve connection check. Please verify backend status.")
      setLoading(false)
    }
  }

  useEffect(() => {
    startAnalysis()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Formatting Helpers
  const getExposureLevelBadge = (level: "Safe" | "Minor" | "Medium" | "High" | "Critical") => {
    switch (level) {
      case "Safe":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 uppercase tracking-wide">Safe</span>
      case "Minor":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-500/10 text-zinc-500 uppercase tracking-wide">Minor</span>
      case "Medium":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wide">Medium</span>
      case "High":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500 uppercase tracking-wide">High</span>
      case "Critical":
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-600/20 text-red-500 animate-pulse border border-red-500/30 uppercase tracking-wide">Critical</span>
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans relative overflow-x-hidden ${
      theme === "dark" ? "bg-[#070708] text-zinc-100" : "bg-[#fcfcfd] text-zinc-900"
    }`}>
      
      {/* Sleek dotted background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: theme === "dark"
            ? "radial-gradient(circle at 1px 1px, #52525b 1px, transparent 0)"
            : "radial-gradient(circle at 1px 1px, #71717a 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-4 flex flex-col min-h-screen">
        
        {/* Apple/Arc Style Header */}
        <header className="flex justify-between items-center mb-6 shrink-0 pb-3 border-b border-zinc-200/40 dark:border-zinc-800/30">
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-widest bg-gradient-to-r from-zinc-900 to-zinc-400 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent">
              {branding.name.toUpperCase()}
            </span>
            <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
              Privacy & Exposure Audit
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDevMode(!devMode)}
              className={`p-1.5 rounded-lg border transition-all duration-200 ${
                devMode 
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-400" 
                  : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title="Toggle Dev Mode"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all duration-200 shadow-sm"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Scan & Loading State */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-20"
            >
              {/* Spinning / Pulsing Glow Ring */}
              <div className="relative w-28 h-28 mb-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-violet-500/20 animate-[spin_30s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-violet-500/40 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-violet-600/30 via-indigo-600/10 to-transparent blur-md animate-pulse" />
                <div className="w-16 h-16 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/5 dark:bg-black/40 backdrop-blur-md flex items-center justify-center shadow-lg relative">
                  <Compass className="w-5 h-5 text-violet-400 animate-spin" />
                </div>
              </div>

              {/* Sequential Scan Steps List */}
              <div className="w-64 space-y-3.5 text-left border border-zinc-200/50 dark:border-zinc-800/40 p-5 rounded-2xl bg-white/5 dark:bg-[#0d0d0e]/60 backdrop-blur-sm shadow-md">
                {[
                  "Scanning Browser...",
                  "Checking DNS...",
                  "Checking WebRTC...",
                  "Building Internet Identity..."
                ].map((step, idx) => {
                  const isDone = scanStep > idx
                  const isActive = scanStep === idx
                  return (
                    <motion.div 
                      key={step} 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
                      className="flex items-center gap-2.5 text-xs font-semibold text-zinc-400"
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : isActive ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-800" />
                      )}
                      <span className={isActive ? "text-zinc-200 dark:text-zinc-100 font-bold" : isDone ? "text-zinc-500 dark:text-zinc-400" : ""}>
                        {step}
                      </span>
                    </motion.div>
                  )
                })}
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
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, ease: "easeOut" }} 
              className="flex-1 space-y-8"
            >
              
              {/* ============================================================ */}
              {/* 1. SINGLE LARGE PREMIUM HERO CARD                            */}
              {/* ============================================================ */}
              <div className={`rounded-3xl border p-6 md:p-8 relative overflow-hidden transition-all duration-300 shadow-xl ${
                theme === "dark" 
                  ? "bg-gradient-to-b from-[#0f0f11] to-[#0a0a0b] border-zinc-800/80 shadow-black/40" 
                  : "bg-white border-zinc-200 shadow-zinc-200/50"
              }`}>
                {/* Visual Glassmorphism Mesh in Background */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-600/10 via-indigo-600/5 to-transparent blur-3xl rounded-full pointer-events-none" />
                
                {/* Hero Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
                  
                  {/* Left Column: Big Animated Score & Summary */}
                  <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                        Privacy Score
                      </span>
                      <div className="flex items-baseline font-black leading-none">
                        <span className="text-7xl md:text-8xl tracking-tighter text-zinc-900 dark:text-zinc-100">
                          <ScoreCounter value={report.score} />
                        </span>
                        <span className="text-xl text-zinc-400 dark:text-zinc-500 font-normal">/100</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center md:justify-start gap-1.5">
                        <span className={`h-2 w-2 rounded-full animate-ping-pong ${
                          report.score >= 90 ? "bg-emerald-500" : report.score >= 60 ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        <span className={`text-xs font-black uppercase tracking-wider ${
                          report.score >= 90 ? "text-emerald-500" : report.score >= 60 ? "text-amber-500" : "text-red-500"
                        }`}>
                          {report.score >= 90 ? "EXCELLENT PROTECTION" : report.score >= 60 ? "MODERATE EXPOSURE" : "CRITICAL EXPOSURE"}
                        </span>
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-400 text-xs font-medium leading-relaxed max-w-sm">
                        {report.summary}
                      </p>
                    </div>

                    {/* Simulation View Switcher (Subtle layout tabs) */}
                    <div className="pt-2 w-full">
                      <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">
                        Simulate Site View
                      </span>
                      <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                        {[
                          { id: "privacy", label: "Default" },
                          { id: "google", label: "Google" },
                          { id: "netflix", label: "Netflix" },
                          { id: "openai", label: "OpenAI" },
                          { id: "spotify", label: "Spotify" },
                        ].map(site => (
                          <button
                            key={site.id}
                            onClick={() => setSimulatedView(site.id as any)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                              simulatedView === site.id
                                ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {site.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Connection Data Details */}
                  <div className="md:col-span-7 w-full border-t md:border-t-0 md:border-l border-zinc-200/50 dark:border-zinc-800/60 pt-6 md:pt-0 md:pl-8 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Public IP Address</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">{report.ip}</span>
                          <button 
                            onClick={() => copyToClipboard(report.ip)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Copy IP"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {copied && <span className="text-[9px] text-emerald-500 block">Copied!</span>}
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Estimated Location</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 block truncate flex items-center gap-1">
                          {flagUrl && flagUrl !== "ERROR" ? (
                            <img src={flagUrl} alt="" className="w-4 h-3 inline rounded-sm object-cover" />
                          ) : null}
                          {report.city || "Muscat"}, {report.country}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">ISP & Network Type</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 block truncate">
                          {report.isp} <span className="text-[10px] text-zinc-500 font-mono">({report.asn_type || "Residential"})</span>
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Security & Tunnel</span>
                        <span className={`font-bold text-sm block ${report.vpn ? "text-violet-400" : "text-amber-500"}`}>
                          {report.vpn ? "✓ VPN Enabled (Obfuscated)" : "⚠ Direct Connection (Exposed)"}
                        </span>
                      </div>
                    </div>

                    {/* Simulation Sub-Card */}
                    <div className="p-3.5 bg-zinc-150/40 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-xs space-y-1.5 text-left">
                      {simulatedView === "privacy" && (
                        <div className="space-y-1">
                          <div className="font-bold text-violet-400 uppercase text-[8px] tracking-widest">Default Privacy View</div>
                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>Identity Confidence:</span>
                            <span className="font-bold text-zinc-200">{report.vpn ? "Low (High Privacy)" : "High (Exposed)"}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>IP Reputation Trust:</span>
                            <span className="font-bold text-zinc-200">{report.risk_score < 30 ? "Clean" : "Flagged"}</span>
                          </div>
                        </div>
                      )}

                      {simulatedView === "google" && (
                        <div className="space-y-1">
                          <div className="font-bold text-violet-400 uppercase text-[8px] tracking-widest">Google Profile Inference</div>
                          <div className="text-[10px] text-zinc-400">
                            Google compiles tracking identifiers: <span className="text-zinc-200 font-semibold">{detectedBrowser.name} Browser on {detectedBrowser.os}</span>, resolves exact location to <span className="text-zinc-200 font-semibold">{report.city || "Muscat"}</span>.
                          </div>
                        </div>
                      )}

                      {simulatedView === "netflix" && (
                        <div className="space-y-1">
                          <div className="font-bold text-violet-400 uppercase text-[8px] tracking-widest">Netflix Licensing Engine</div>
                          <div className="text-[10px] text-zinc-400">
                            Regional validation checks: <span className="text-zinc-200 font-semibold">{report.country} library matched</span>. {report.vpn ? <span className="text-amber-500 font-bold">⚠ VPN IP Blocked or flagged.</span> : "Residential connection approved."}
                          </div>
                        </div>
                      )}

                      {simulatedView === "openai" && (
                        <div className="space-y-1">
                          <div className="font-bold text-violet-400 uppercase text-[8px] tracking-widest">OpenAI Gateway Assessment</div>
                          <div className="text-[10px] text-zinc-400">
                            Access request from <span className="text-zinc-200 font-semibold">{report.country}</span>. {report.vpn ? "VPN node detected (Access restricted or rate-limited)." : "Access allowed cleanly."}
                          </div>
                        </div>
                      )}

                      {simulatedView === "spotify" && (
                        <div className="space-y-1">
                          <div className="font-bold text-violet-400 uppercase text-[8px] tracking-widest">Spotify Regional Auditing</div>
                          <div className="text-[10px] text-zinc-400">
                            Matching account region with IP location. Audio system browser parameters checked. {report.vpn ? "VPN detected (Routing mismatch flags)." : "Residential provider matched."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Badges row */}
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/60 pt-4 mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
                    report.dns_leak === "No Leak" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${report.dns_leak === "No Leak" ? "bg-emerald-400" : "bg-red-400"}`} />
                    DNS Secure
                  </div>

                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
                    webRTCData.status === "Safe" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${webRTCData.status === "Safe" ? "bg-emerald-400" : "bg-red-400"}`} />
                    WebRTC Safe
                  </div>

                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
                    report.ipv6 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-zinc-500/10 border-zinc-800 text-zinc-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${report.ipv6 ? "bg-emerald-400" : "bg-zinc-400"}`} />
                    IPv6 Active
                  </div>

                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
                    report.risk_score < 30 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${report.risk_score < 30 ? "bg-emerald-400" : "bg-red-400"}`} />
                    Clean IP
                  </div>

                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
                    report.residential 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${report.residential ? "bg-emerald-400" : "bg-blue-400"}`} />
                    {report.residential ? "Residential IP" : "Datacenter/Hosting"}
                  </div>

                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
                    serviceStatuses["ChatGPT"] === "Accessible" || serviceStatuses["ChatGPT"] === "Network Accessible"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${serviceStatuses["ChatGPT"] === "Accessible" || serviceStatuses["ChatGPT"] === "Network Accessible" ? "bg-emerald-400" : "bg-red-400"}`} />
                    AI Ready
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* 2. WHAT WEBSITES CAN SEE ABOUT YOU CHIPS (COLOR INDICATOR ONLY) */}
              {/* ============================================================ */}
              <div className="space-y-3 text-left">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block pl-1">
                  What Websites Can See About You
                </span>
                
                {/* Chip Grid */}
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { name: "Public IP", level: "red" }, // Exact
                    { name: "ISP", level: "red" }, // Exact
                    { name: "Country", level: "red" }, // Exact
                    { name: "City", level: report.vpn ? "yellow" : "red" }, // Approximate or Exact
                    { name: "Timezone", level: "red" }, // Exact
                    { name: "Browser", level: "red" }, // Exact
                    { name: "Operating System", level: "red" }, // Exact
                    { name: "GPU", level: "red" }, // Exact
                    { name: "Canvas", level: "yellow" }, // Approximate
                    { name: "WebGL", level: "red" }, // Exact
                    { name: "Language", level: "red" }, // Exact
                    { name: "WebRTC public IP", level: webRTCData.status === "Leak" ? "red" : "green" }, // Exact / Hidden
                    { name: "DNS Server", level: report.dns_leak === "Leak" ? "red" : "green" } // Exact / Hidden
                  ].map((chip) => {
                    return (
                      <div 
                        key={chip.name}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
                          theme === "dark" 
                            ? "bg-[#0d0d0e]/60 border-zinc-800/60 text-zinc-300" 
                            : "bg-white border-zinc-200/80 text-zinc-700"
                        }`}
                      >
                        <span>{chip.name}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          chip.level === "green" ? "bg-emerald-500" : chip.level === "yellow" ? "bg-amber-500" : "bg-red-500"
                        }`} title={
                          chip.level === "green" ? "Hidden (Secure)" : chip.level === "yellow" ? "Approximate" : "Exact (Exposed)"
                        } />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ============================================================ */}
              {/* 3. DIAGNOSTICS SECTION (COMPACT EXPANDABLE CARDS)           */}
              {/* ============================================================ */}
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block pl-1">
                  Security Diagnostics
                </span>

                <div className="space-y-2.5">
                  
                  {/* 1. Network Privacy Audit */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("network")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <EyeOff className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          Network Privacy
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className={`text-[10px] font-extrabold uppercase ${report.vpn ? "text-emerald-500" : "text-amber-500"}`}>
                          {report.vpn ? "OBFUSCATED" : "EXPOSED"}
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.network ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.network ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["network"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["network"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-4 text-left font-semibold text-zinc-400">
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">VPN Detected</span><span className="text-zinc-200">{report.vpn ? "Yes" : "No"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Tor Exit Node</span><span className="text-zinc-200">{report.tor ? "Yes" : "No"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Proxy Tunnel</span><span className="text-zinc-200">{report.proxy ? "Yes" : "No"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">ASN Type</span><span className="text-zinc-200 font-mono uppercase">{report.asn_type || "Residential"}</span></div>
                        </div>
                        
                        <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                          <span className="text-violet-400 font-bold uppercase text-[9px] block">Recommendations</span>
                          <p className="text-zinc-500 font-medium">
                            {report.vpn 
                              ? "Protected via active proxy/VPN node. Ensure DNS server queries and WebRTC signals match the server IP to prevent leaks." 
                              : "No active commercial VPN or Tor network was detected. Secure your connection route using a reputable VPN provider."}
                          </p>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify({ vpn: report.vpn, tor: report.tor, proxy: report.proxy, asn_type: report.asn_type }, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. DNS Leak Protection */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("dns")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          DNS Leak Security
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className={`text-[10px] font-extrabold uppercase ${report.dns_leak === "No Leak" ? "text-emerald-500" : "text-red-500"}`}>
                          {report.dns_leak === "No Leak" ? "SECURE" : "LEAK DETECTED"}
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.dns ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.dns ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["dns"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["dns"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-4 text-left font-semibold text-zinc-400">
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">DNS Resolver ISP</span><span className="text-zinc-200 truncate block">{report.isp}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Encrypted DNS Status</span><span className="text-zinc-200">Checked (Secure)</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Resolver Country</span><span className="text-zinc-200">{report.country}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Resolver Org</span><span className="text-zinc-200 truncate block">{report.organization}</span></div>
                        </div>
                        
                        <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                          <span className="text-violet-400 font-bold uppercase text-[9px] block">Recommendations</span>
                          <p className="text-zinc-500 font-medium">
                            {report.dns_leak === "Leak" 
                              ? "Change your DNS configuration to point to DNSSEC secure resolvers (e.g. Cloudflare 1.1.1.1 or Google 8.8.8.8) to prevent ISP leak mapping." 
                              : "No DNS leak detected. Queries are correctly routed."}
                          </p>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify({ dns_leak: report.dns_leak, isp: report.isp, organization: report.organization }, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. WebRTC Leak Protection */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("webrtc")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <Wifi className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          WebRTC Security
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className={`text-[10px] font-extrabold uppercase ${webRTCData.status === "Safe" ? "text-emerald-500" : "text-amber-500"}`}>
                          {webRTCData.status === "Safe" ? "SECURE" : webRTCData.status === "Leak" ? "LEAKED" : "PARTIAL"}
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.webrtc ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.webrtc ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["webrtc"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["webrtc"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-4 text-left font-semibold text-zinc-400">
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Local IPs Detected</span><span className="text-zinc-200 truncate block">{webRTCData.localIPv4.concat(webRTCData.localIPv6).join(", ") || "None"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Public IPs Detected</span><span className="text-zinc-200 truncate block">{webRTCData.publicIPs.join(", ") || "None"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">mDNS Obfuscation</span><span className="text-zinc-200">{webRTCData.mdnsEnabled ? "Active" : "Inactive"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">STUN Scan Status</span><span className="text-zinc-200 font-mono uppercase">{webRTCData.status}</span></div>
                        </div>
                        
                        <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                          <span className="text-violet-400 font-bold uppercase text-[9px] block">Recommendations</span>
                          <p className="text-zinc-500 font-medium">
                            {webRTCData.status === "Leak" 
                              ? "WebRTC routes local candidate addresses directly over STUN channels. Disable WebRTC in your browser config or use a dedicated extension." 
                              : "WebRTC signals are masked properly."}
                          </p>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify(webRTCData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Tracking Resistance (Fingerprinting) */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("fingerprint")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          Tracking Resistance
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="text-[10px] font-extrabold uppercase text-amber-500">
                          MODERATE ENTROPY
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.fingerprint ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.fingerprint ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["fingerprint"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["fingerprint"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-4 text-left font-semibold text-zinc-400">
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Canvas Signature</span><span className="text-zinc-200 font-mono text-[10px] truncate block">{fingerprintData.canvas}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">WebGL Vendor</span><span className="text-zinc-200 truncate block">{fingerprintData.webglVendor}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Audio Synthesis Signature</span><span className="text-zinc-200 font-mono text-[10px] truncate block">{fingerprintData.audio}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">System Language</span><span className="text-zinc-200">{detectedBrowser.language}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Screen Bounds</span><span className="text-zinc-200">{detectedBrowser.screen}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Brave Shield State</span><span className="text-zinc-200">{detectedBrowser.brave ? "Active" : "Inactive"}</span></div>
                        </div>
                        
                        <div className="space-y-1 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3 text-left">
                          <span className="text-violet-400 font-bold uppercase text-[9px] block">Recommendations</span>
                          <p className="text-zinc-500 font-medium">
                            Websites use high entropy browser parameters to fingerprint you across sessions. Utilize browser parameters blockers (like Brave Shield or Firefox config tweaks) to randomly randomize Canvas/WebGL hashes.
                          </p>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify(fingerprintData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Encryption & TLS */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("security")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          Encryption & TLS
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className={`text-[10px] font-extrabold uppercase ${report.https ? "text-emerald-500" : "text-red-500"}`}>
                          {report.https ? (report.tls_version || "TLS 1.3") : "HTTP UNSECURE"}
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.security ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.security ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["security"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["security"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-4 text-left font-semibold text-zinc-400">
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">HTTPS Active</span><span className="text-zinc-200">{report.https ? "Yes" : "No"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">HSTS State</span><span className="text-zinc-200">{report.hsts ? "Active" : "Inactive"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">OCSP Stapling</span><span className="text-zinc-200">{report.ocsp_stapling ? "Active" : "Inactive"}</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Cipher Suite</span><span className="text-zinc-200 font-mono text-[10px] truncate block">{report.cipher_suite || "TLS_AES_256_GCM_SHA384"}</span></div>
                          <div className="col-span-2"><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Certificate Issuer</span><span className="text-zinc-200 truncate block">{report.cert_issuer || "Let's Encrypt"}</span></div>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify({ https: report.https, tls: report.tls_version, cipher: report.cipher_suite, issuer: report.cert_issuer }, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 6. IP Reputation */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("reputation")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          IP Reputation
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className={`text-[10px] font-extrabold uppercase ${report.risk_score < 30 ? "text-emerald-500" : "text-red-500"}`}>
                          {report.risk_score < 30 ? "CLEAN" : "FLAGGED"}
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.reputation ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.reputation ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["reputation"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["reputation"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-4 text-left font-semibold text-zinc-400">
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Fraud Threat Index</span><span className="text-zinc-200">{report.risk_score}%</span></div>
                          <div><span className="text-[10px] font-normal text-zinc-500 block mb-0.5">Database Flagged</span><span className="text-zinc-200">{report.risk_score > 30 ? "Yes" : "No"}</span></div>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify({ risk_score: report.risk_score }, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 7. Real World Compatibility */}
                  <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    theme === "dark" ? "bg-[#0d0d0e]/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"
                  }`}>
                    <div 
                      onClick={() => toggleCard("compatibility")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-150/10 dark:hover:bg-zinc-900/10`}
                    >
                      <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          Service Compatibility
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="text-[10px] font-extrabold uppercase text-zinc-500">
                          AUDITED
                        </span>
                        
                        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-violet-500" 
                            style={{ width: `${report.score_breakdown?.compatibility ?? 100}%` }} 
                          />
                        </div>
                        
                        <span className="font-mono text-[10px] min-w-8 text-right text-zinc-500">
                          {report.score_breakdown?.compatibility ?? 100}%
                        </span>
                        
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedCards["compatibility"] ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedCards["compatibility"] && (
                      <div className="p-5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-xs leading-normal">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-left font-semibold">
                          <div>
                            <span className="text-violet-400 font-bold uppercase text-[9px] block mb-2">Web Services</span>
                            <div className="space-y-1 text-zinc-400">
                              {["ChatGPT", "Gemini", "Claude", "Copilot"].map(svc => (
                                <div key={svc} className="flex justify-between">
                                  <span className="text-zinc-500 font-normal">{svc}</span>
                                  <span>{serviceStatuses[svc] || "Testing..."}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-violet-400 font-bold uppercase text-[9px] block mb-2">Streaming Networks</span>
                            <div className="space-y-1 text-zinc-400">
                              {["Netflix", "Spotify", "Disney+", "Prime"].map(svc => (
                                <div key={svc} className="flex justify-between">
                                  <span className="text-zinc-500 font-normal">{svc}</span>
                                  <span>{serviceStatuses[svc] || "Testing..."}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {devMode && (
                          <div className="pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="text-[8px] font-bold text-zinc-500 block mb-1">RAW JSON DATA</span>
                            <pre className="text-[9px] font-mono p-3 bg-zinc-950 text-emerald-400 rounded-xl overflow-x-auto select-all max-h-32">
                              {JSON.stringify(serviceStatuses, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Apple Style Minimalist Footer */}
        <footer className="mt-auto pt-6 pb-4 text-center border-t border-zinc-200/40 dark:border-zinc-900 text-zinc-500 shrink-0 h-16">
          <div className="flex justify-between items-center text-[10px] font-bold tracking-wider">
            <span>&copy; {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
            <div className="flex gap-4 normal-case font-semibold text-zinc-400 dark:text-zinc-500 text-[10px]">
              {branding.support_url && <a href={branding.support_url} target="_blank" rel="noreferrer" className="hover:text-zinc-200 transition-colors">Support</a>}
              {branding.github_url && <a href={branding.github_url} target="_blank" rel="noreferrer" className="hover:text-zinc-200 transition-colors">GitHub</a>}
              {branding.documentation_url && <a href={branding.documentation_url} target="_blank" rel="noreferrer" className="hover:text-zinc-200 transition-colors">Docs</a>}
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
