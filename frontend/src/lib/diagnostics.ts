import type {
  BrowserDetails,
  FingerprintData,
  ServiceStatus,
  WebRTCData,
} from "@/types/report"

export function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return "Unsupported"
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillStyle = "#f60"
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = "#069"
    ctx.fillText("NeoCheck", 2, 15)
    const data = canvas.toDataURL()
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i)
      hash = hash & hash
    }
    return `canvas_${Math.abs(hash).toString(16)}`
  } catch {
    return "Blocked"
  }
}

export function getWebGLFingerprint(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (!gl) return { vendor: "N/A", renderer: "N/A" }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
    if (!debugInfo) return { vendor: "Generic", renderer: "Generic" }
    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Unknown",
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown",
    }
  } catch {
    return { vendor: "Blocked", renderer: "Blocked" }
  }
}

export function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        resolve("Unsupported")
        return
      }
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      const analyser = context.createAnalyser()
      oscillator.type = "sine"
      oscillator.frequency.value = 440
      gainNode.gain.value = 0
      oscillator.connect(gainNode)
      gainNode.connect(analyser)
      analyser.connect(context.destination)
      oscillator.start(0)
      setTimeout(() => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteTimeDomainData(dataArray)
        let hash = 0
        for (let i = 0; i < dataArray.length; i++) {
          hash = ((hash << 5) - hash) + dataArray[i]
          hash = hash & hash
        }
        oscillator.stop()
        context.close()
        resolve(`audio_${Math.abs(hash).toString(16)}`)
      }, 100)
    } catch {
      resolve("Blocked")
    }
  })
}

function checkFont(fontName: string): boolean {
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return false
    const text = "abcdefghijklmnopqrstuvwxyz0123456789"
    ctx.font = "72px sans-serif"
    const baselineWidth = ctx.measureText(text).width
    ctx.font = `72px '${fontName}', sans-serif`
    return ctx.measureText(text).width !== baselineWidth
  } catch {
    return false
  }
}

export function getInstalledFonts(): string[] {
  const fonts = ["Courier New", "Arial", "Times New Roman", "Helvetica", "Verdana", "Georgia"]
  return fonts.filter(checkFont)
}

export async function detectBrowserDetails(): Promise<BrowserDetails> {
  if (typeof window === "undefined") {
    return { name: "Unknown", version: "—", os: "Unknown", platform: "—", language: "—", screen: "—", cookies: false, touch: false }
  }

  let browserName = "Unknown"
  let browserVer = "—"
  let osName = "Unknown"
  let platformName = "Desktop"

  if (navigator.userAgentData) {
    const data = navigator.userAgentData
    platformName = data.mobile ? "Mobile" : "Desktop"
    const activeBrand = data.brands.find(b => b.brand !== "Not A(Brand" && b.brand !== "Chromium")
    browserName = activeBrand?.brand ?? "Chromium"
    browserVer = activeBrand?.version ?? "—"
    try {
      const highEntropy = await data.getHighEntropyValues(["platformVersion"])
      const pv = parseFloat(highEntropy.platformVersion || "0")
      if (data.platform === "Windows") osName = pv >= 13 ? "Windows 11" : "Windows 10"
      else osName = data.platform || "Unknown"
    } catch {
      osName = data.platform || "Unknown"
    }
  } else {
    const ua = navigator.userAgent
    if (/mobi/i.test(ua)) platformName = "Mobile"
    if (/Windows NT 10/i.test(ua)) osName = "Windows"
    else if (/Mac OS X/i.test(ua)) osName = "macOS"
    else if (/Android/i.test(ua)) osName = "Android"
    else if (/Linux/i.test(ua)) osName = "Linux"
    if (/Edg\//i.test(ua)) browserName = "Edge"
    else if (/Firefox\//i.test(ua)) browserName = "Firefox"
    else if (/Chrome\//i.test(ua)) browserName = "Chrome"
    else if (/Safari\//i.test(ua)) browserName = "Safari"
  }

  return {
    name: browserName,
    version: browserVer,
    os: osName,
    platform: platformName,
    language: navigator.language || "en",
    screen: `${window.screen.width}×${window.screen.height}`,
    cookies: navigator.cookieEnabled,
    touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
  }
}

export function scanWebRTC(currentPublicIP: string, isVpn: boolean): Promise<WebRTCData> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.RTCPeerConnection) {
      resolve({ status: "Unsupported", localIPv4: [], localIPv6: [], publicIPs: [], mdnsEnabled: false, cgnat: false })
      return
    }

    const localIPv4s: string[] = []
    const localIPv6s: string[] = []
    const publicIPs: string[] = []
    let mdnsEnabled = false
    let cgnat = false

    const rtc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    rtc.createDataChannel("")
    rtc.createOffer().then(o => rtc.setLocalDescription(o)).catch(() => {})

    const finish = () => {
      let status: WebRTCData["status"] = "Safe"
      if (localIPv4s.length > 0 || localIPv6s.length > 0) status = "Partial"
      if (publicIPs.some(ip => ip !== currentPublicIP) || (publicIPs.length > 0 && isVpn)) status = "Leak"
      resolve({ status, localIPv4: localIPv4s, localIPv6: localIPv6s, publicIPs, mdnsEnabled, cgnat })
    }

    const timeout = setTimeout(() => { rtc.close(); finish() }, 2500)

    rtc.onicecandidate = (event) => {
      if (!event.candidate) return
      const parts = event.candidate.candidate.split(" ")
      if (parts.length < 8) return
      const ip = parts[4]
      const type = parts[7]
      if (ip.endsWith(".local")) mdnsEnabled = true

      const isIPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)
      const isPrivateIPv4 = isIPv4 && (
        ip.startsWith("10.") || ip.startsWith("192.168.") ||
        (ip.startsWith("172.") && parseInt(ip.split(".")[1], 10) >= 16 && parseInt(ip.split(".")[1], 10) <= 31)
      )
      if (isIPv4 && ip.startsWith("100.")) {
        const second = parseInt(ip.split(".")[1], 10)
        if (second >= 64 && second <= 127) cgnat = true
      }
      if (isPrivateIPv4 && !localIPv4s.includes(ip)) localIPv4s.push(ip)
      if (!ip.endsWith(".local") && !isPrivateIPv4 && type === "srflx" && !publicIPs.includes(ip)) {
        publicIPs.push(ip)
      }
    }

    rtc.onicegatheringstatechange = () => {
      if (rtc.iceGatheringState === "complete") {
        clearTimeout(timeout)
        rtc.close()
        finish()
      }
    }
  })
}

async function checkService(url: string, isVpnOrProxy: boolean): Promise<ServiceStatus> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 2200)
    await fetch(url, { mode: "no-cors", credentials: "omit", signal: controller.signal })
    clearTimeout(id)
    return isVpnOrProxy ? "Network Accessible" : "Accessible"
  } catch {
    return "Blocked"
  }
}

export async function runServiceChecks(isVpnOrProxy: boolean): Promise<Record<string, ServiceStatus>> {
  const services = [
    { name: "ChatGPT", url: "https://chatgpt.com/favicon.ico" },
    { name: "Netflix", url: "https://www.netflix.com/favicon.ico" },
    { name: "Spotify", url: "https://open.spotify.com/favicon.ico" },
  ]
  const results: Record<string, ServiceStatus> = {}
  await Promise.all(services.map(async (svc) => {
    results[svc.name] = await checkService(svc.url, isVpnOrProxy)
  }))
  return results
}

export async function collectClientDiagnostics(publicIP: string, isVpn: boolean): Promise<{
  fingerprint: FingerprintData
  webRTC: WebRTCData
  browser: BrowserDetails
  services: Record<string, ServiceStatus>
}> {
  const [browser, audio, webRTC, services] = await Promise.all([
    detectBrowserDetails(),
    getAudioFingerprint(),
    scanWebRTC(publicIP, isVpn),
    runServiceChecks(isVpn),
  ])
  const webgl = getWebGLFingerprint()
  return {
    fingerprint: {
      canvas: getCanvasFingerprint(),
      webglVendor: webgl.vendor,
      webglRenderer: webgl.renderer,
      audio,
      fonts: getInstalledFonts(),
    },
    webRTC,
    browser,
    services,
  }
}
