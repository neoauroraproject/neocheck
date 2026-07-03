"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight, RefreshCw } from "lucide-react"
import { LocaleProvider, useLocale } from "@/components/locale-provider"
import { LanguageToggle, PrivacyDashboard } from "@/components/privacy-dashboard"
import { collectClientDiagnostics } from "@/lib/diagnostics"
import { cn } from "@/lib/utils"
import type {
  Branding,
  BrowserDetails,
  ConnectionReport,
  EnvironmentSignals,
  FingerprintData,
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

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#050506]" />
      <div className="absolute -top-32 start-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-[120px]" />
      <div className="absolute bottom-0 end-0 h-[320px] w-[480px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  )
}

function HomeContent() {
  const { tr } = useLocale()
  const [report, setReport] = useState<ConnectionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [branding, setBranding] = useState(defaultBranding)
  const [fingerprint, setFingerprint] = useState<FingerprintData | null>(null)
  const [webRTC, setWebRTC] = useState<WebRTCData | null>(null)
  const [browser, setBrowser] = useState<BrowserDetails | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentSignals | null>(null)

  useEffect(() => {
    fetch("/api/branding")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setBranding(d) })
      .catch(() => {})
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
      setEnvironment(client.environment)
      setReport(data)
    } catch {
      setError(tr("error"))
    } finally {
      setLoading(false)
    }
  }, [tr])

  useEffect(() => {
    runAnalysis()
  }, [runAnalysis])

  const copyIP = () => {
    if (!report?.ip) return
    navigator.clipboard.writeText(report.ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <AmbientBackground />
      <div className="min-h-screen flex flex-col text-zinc-100">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#050506]/80 backdrop-blur-xl">
          <div className="mx-auto max-w-xl sm:max-w-2xl lg:max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">{branding.name}</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageToggle />
              <button
                type="button"
                onClick={runAnalysis}
                disabled={loading}
                className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-40 px-2.5 py-1.5 rounded-full hover:bg-white/[0.04]"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                <span className="hidden sm:inline">{loading ? tr("analyzing") : tr("refresh")}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-xl sm:max-w-2xl lg:max-w-3xl px-4 sm:px-6 py-8 sm:py-12 lg:py-14">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="load"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-20 sm:py-28 flex flex-col items-center text-center gap-6"
              >
                <div className="relative size-16">
                  <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-t border-zinc-400"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  />
                </div>
                <div>
                  <p className="text-sm text-zinc-300">{tr("analyzing")}</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">{tr("analyzingDesc")}</p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 space-y-4 text-center">
                <p className="text-sm text-zinc-400">{error}</p>
                <button type="button" onClick={runAnalysis} className="text-sm text-zinc-300 underline underline-offset-4">
                  {tr("tryAgain")}
                </button>
              </motion.div>
            ) : report ? (
              <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <PrivacyDashboard
                report={report}
                browser={browser}
                fingerprint={fingerprint}
                webRTC={webRTC}
                environment={environment}
                onCopyIp={copyIP}
                copied={copied}
              />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <footer className="border-t border-white/[0.06] mt-auto">
          <div className="mx-auto max-w-xl sm:max-w-2xl lg:max-w-3xl px-4 sm:px-6 py-6 sm:py-8 flex justify-between text-xs text-zinc-600">
            <span>© {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
            {branding.github_url && (
              <a href={branding.github_url} target="_blank" rel="noreferrer" className="hover:text-zinc-400 inline-flex items-center gap-1">
                {tr("github")} <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>
        </footer>
      </div>
    </>
  )
}

export default function Home() {
  return (
    <LocaleProvider>
      <HomeContent />
    </LocaleProvider>
  )
}
