"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight, RefreshCw } from "lucide-react"
import { LocaleProvider, useLocale } from "@/components/locale-provider"
import { LanguageToggle, PrivacyDashboard } from "@/components/privacy-dashboard"
import { ThemeProvider, ThemeToggle } from "@/components/theme-provider"
import { collectClientDiagnostics } from "@/lib/diagnostics"
import { cn } from "@/lib/utils"
import type {
  Branding,
  BrowserDetails,
  ConnectionReport,
  EnvironmentSignals,
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

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-nc-page transition-colors duration-300" />
      <div
        className="absolute -top-32 start-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[120px] transition-colors duration-300"
        style={{ backgroundColor: "var(--ambient-a)" }}
      />
      <div
        className="absolute bottom-0 end-0 h-[320px] w-[480px] rounded-full blur-[100px] transition-colors duration-300"
        style={{ backgroundColor: "var(--ambient-b)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--dot-grid) 1px, transparent 0)",
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
  const [services, setServices] = useState<Record<string, ServiceStatus>>({})

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
      setServices(client.services)
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
      <div className="min-h-screen flex flex-col text-nc-primary">
        <header className="sticky top-0 z-20 border-b border-nc-divider bg-nc-header backdrop-blur-xl supports-[backdrop-filter]:bg-nc-header">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[3.75rem] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-nc-primary">{branding.name}</span>
              <span className="hidden sm:inline text-[11px] text-nc-faint truncate">{tr("tagline")}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <LanguageToggle />
              <button
                type="button"
                onClick={runAnalysis}
                disabled={loading}
                className="text-sm text-nc-muted hover:text-nc-secondary transition-colors flex items-center gap-2 disabled:opacity-40 px-2.5 py-1.5 rounded-full hover:bg-nc-hover"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                <span className="hidden sm:inline">{loading ? tr("analyzing") : tr("refresh")}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 xl:py-14">
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
                  <div className="absolute inset-0 rounded-full border border-nc-divider" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-t border-nc-muted"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  />
                </div>
                <div>
                  <p className="text-sm text-nc-secondary">{tr("analyzing")}</p>
                  <p className="text-xs text-nc-muted mt-1 max-w-xs">{tr("analyzingDesc")}</p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 space-y-4 text-center">
                <p className="text-sm text-nc-muted">{error}</p>
                <button type="button" onClick={runAnalysis} className="text-sm text-nc-secondary underline underline-offset-4">
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
                services={services}
                onCopyIp={copyIP}
                copied={copied}
              />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <footer className="border-t border-nc-divider mt-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex justify-between text-xs text-nc-faint">
            <span>© {new Date().getFullYear()} {branding.copyright_text || branding.name}</span>
            {branding.github_url && (
              <a href={branding.github_url} target="_blank" rel="noreferrer" className="hover:text-nc-muted inline-flex items-center gap-1">
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
      <ThemeProvider>
        <HomeContent />
      </ThemeProvider>
    </LocaleProvider>
  )
}
