"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, Copy, Languages } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { useLocale } from "@/components/locale-provider"
import { analyzeLeaks } from "@/lib/visibility-analyzer-engine"
import {
  runPrivacyPlatformAnalysis,
  type CompatLevel,
  type LeakVerdict,
  type UniquenessLevel,
  type VisibilityLevel,
} from "@/lib/privacy-platform-engine"
import { cn } from "@/lib/utils"
import type {
  BrowserDetails,
  ConnectionReport,
  EnvironmentSignals,
  FingerprintData,
  WebRTCData,
} from "@/types/report"

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm", className)}>
      {children}
    </div>
  )
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-sm text-zinc-300 hover:text-zinc-100">
        <span className="font-medium">{title}</span>
        <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 sm:px-5 pb-5 border-t border-white/[0.05] pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const tone = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400"
  return (
    <div className="text-center">
      <p className={cn("text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight", tone)}>{score}</p>
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 mt-1">{label}</p>
    </div>
  )
}

function LevelPill({ level }: { level: VisibilityLevel }) {
  const { tr } = useLocale()
  const map = {
    visible: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    unavailable: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  }
  const key = level === "visible" ? "levelVisible" : level === "partial" ? "levelPartial" : "levelUnavailable"
  return <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0", map[level])}>{tr(key)}</span>
}

function CompatPill({ level }: { level: CompatLevel }) {
  const { tr } = useLocale()
  const map = {
    likely: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    limited: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    unknown: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  }
  const key = level === "likely" ? "compatLikely" : level === "limited" ? "compatLimited" : "compatUnknown"
  return <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", map[level])}>{tr(key)}</span>
}

function leakTone(v: LeakVerdict) {
  if (v === "clear") return "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
  if (v === "warning") return "border-amber-500/20 bg-amber-500/[0.06] text-amber-300"
  return "border-rose-500/20 bg-rose-500/[0.06] text-rose-300"
}

function fpTone(l: UniquenessLevel) {
  if (l === "low") return "text-emerald-400"
  if (l === "medium") return "text-amber-400"
  return "text-rose-400"
}

export function PrivacyDashboard({
  report,
  browser,
  fingerprint,
  webRTC,
  environment,
  onCopyIp,
  copied,
}: {
  report: ConnectionReport
  browser: BrowserDetails | null
  fingerprint: FingerprintData | null
  webRTC: WebRTCData | null
  environment: EnvironmentSignals | null
  onCopyIp: () => void
  copied: boolean
}) {
  const { locale, tr, rtl } = useLocale()

  const env = environment || {
    timezone: "—", locale: "—", languages: [], hardwareConcurrency: 0, deviceMemory: null,
    touchSupport: false, colorDepth: 0, doNotTrack: null, cookiesEnabled: false,
    localStorage: false, sessionStorage: false, currencyLocale: "—", clockOffsetMinutes: 0,
    webgpu: "unavailable" as const, batteryApi: false, clipboardApi: false, bluetoothApi: false,
    usbApi: false, mediaDevicesCount: 0, permissionsApi: false, javascriptEnabled: true,
    webglSupported: false, architecture: "—", userAgent: "—",
  }

  const data = useMemo(() => {
    const leaks = analyzeLeaks(report, webRTC, env)
    return runPrivacyPlatformAnalysis({ report, browser, fingerprint, webRTC, environment: env, leaks })
  }, [report, browser, fingerprint, webRTC, env])

  return (
    <div className="space-y-4 sm:space-y-5">
      <p className="text-sm text-zinc-500">{tr("mainQuestion")}</p>

      {/* §1 Overview */}
      <Card className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">{tr("sectionOverview")}</p>
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
          <ScoreBadge score={data.overview.privacyScore} label={tr("privacyScore")} />
          <div className="flex-1 space-y-4 min-w-0">
            <button type="button" onClick={onCopyIp} className="flex items-center gap-3 group">
              <CountryFlag code={report.country_code} size="lg" />
              <div className="text-start min-w-0">
                <p className="font-mono text-lg text-zinc-100 ltr-mono truncate">{report.ip}</p>
                <p className="text-sm text-zinc-400 truncate">{report.country}{data.overview.city !== "—" ? ` · ${data.overview.city}` : ""}</p>
              </div>
              <Copy className="size-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
              {copied && <span className="text-xs text-emerald-500">{tr("copied")}</span>}
            </button>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06]">{tr(data.overview.connectionStatusKey)}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06]">{tr(data.overview.connectionTypeKey)}</span>
              <span className={cn("px-2.5 py-1 rounded-full border", data.overview.riskLevel === "high" ? "border-rose-500/20 text-rose-400 bg-rose-500/10" : data.overview.riskLevel === "medium" ? "border-amber-500/20 text-amber-400 bg-amber-500/10" : "border-emerald-500/20 text-emerald-400 bg-emerald-500/10")}>
                {tr(data.overview.riskKey)}
              </span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">{tr(data.overview.summaryKey)}</p>
          </div>
        </div>
      </Card>

      {/* §2 Leak Detection */}
      <Card className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{tr("sectionLeak")}</p>
        <p className="text-sm text-zinc-500 mb-4">{tr("sectionLeakDesc")}</p>

        {data.leak.candidates.length > 0 ? (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
            {data.leak.candidates.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5 border border-white/[0.04]">
                <span className="text-xs text-zinc-500">{tr(c.labelKey)}</span>
                <span className="text-xs font-mono text-zinc-300 ltr-mono truncate">{c.ip}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 mb-4">{tr("exposureClear")}</p>
        )}

        <div className={cn("rounded-xl border px-4 py-3", leakTone(data.leak.verdict))}>
          <p className="text-sm font-medium">{tr("leakResult")}: {tr(data.leak.verdictKey)}</p>
          <p className="text-xs mt-1 opacity-80 leading-relaxed">{tr(data.leak.whyKey)}</p>
        </div>

        {data.leak.findings.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {data.leak.findings.map(f => (
              <li key={f.id} className="text-xs text-zinc-500 flex gap-2">
                <span className="text-rose-400 shrink-0">•</span>
                {tr(f.messageKey)}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* §4 Consistency + §5 Fingerprint — side by side */}
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{tr("sectionConsistency")}</p>
          <ScoreBadge score={data.consistencyScore} label={tr("heroConsistency")} />
          <p className="text-xs text-zinc-500 mt-4 leading-relaxed">{tr(data.consistencySummaryKey)}</p>
          {data.signalIssues.length > 0 && (
            <ul className="mt-3 space-y-2">
              {data.signalIssues.slice(0, 3).map(s => (
                <li key={s.id} className="text-xs text-amber-400/90 leading-relaxed">{tr(s.messageKey)}</li>
              ))}
            </ul>
          )}
          {data.signalIssues.length === 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
              <Check className="size-3.5" /> {tr("noMismatches")}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{tr("sectionFingerprint")}</p>
          <p className={cn("text-2xl font-semibold", fpTone(data.fingerprintLevel))}>{tr(data.fingerprintKey)}</p>
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed">{tr(data.fingerprintWhyKey)}</p>
        </Card>
      </div>

      {/* §3 Website Visibility — accordion */}
      <Accordion title={tr("sectionVisibilityTitle")}>
        <div className="space-y-1">
          {data.visibility.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-300">{tr(item.labelKey)}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed hidden sm:block">{tr(item.whyKey)}</p>
              </div>
              <div className={cn("flex flex-col items-end gap-1 shrink-0 max-w-[45%]", rtl && "items-start")}>
                <LevelPill level={item.level} />
                <span className="text-[11px] font-mono text-zinc-500 truncate ltr-mono">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* §6 Streaming */}
      <Accordion title={tr("sectionStreaming")}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.streaming.map(s => (
            <div key={s.id} className="rounded-xl border border-white/[0.05] bg-black/15 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-zinc-300 truncate">{s.name}</span>
                <CompatPill level={s.level} />
              </div>
              <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2">{tr(s.reasonKey)}</p>
            </div>
          ))}
        </div>
      </Accordion>

      {/* §7 Reputation */}
      <Accordion title={tr("sectionReputation")}>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex justify-between gap-2 border-b border-white/[0.04] pb-2">
            <dt className="text-zinc-500">{tr("fraudScore")}</dt>
            <dd className="text-zinc-300 tabular-nums">{data.reputation.fraudScore}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/[0.04] pb-2">
            <dt className="text-zinc-500">ASN</dt>
            <dd className="text-zinc-300 text-end text-xs">{tr(data.reputation.asnReputationKey)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/[0.04] pb-2">
            <dt className="text-zinc-500">{tr("residentialConf")}</dt>
            <dd className="text-zinc-300 tabular-nums">{data.reputation.residentialConfidence}%</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/[0.04] pb-2">
            <dt className="text-zinc-500">{tr("hostingConf")}</dt>
            <dd className="text-zinc-300 tabular-nums">{data.reputation.hostingConfidence}%</dd>
          </div>
        </dl>
      </Accordion>

      {/* §8 Recommendations */}
      {data.recommendations.length > 0 && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{tr("sectionRecommendations")}</p>
          <ul className="space-y-2">
            {data.recommendations.map(r => (
              <li key={r.id} className="flex gap-2.5 text-sm text-zinc-400 leading-relaxed">
                <span className="text-violet-400 shrink-0">→</span>
                {tr(r.textKey)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* §9 Advanced */}
      <Accordion title={tr("sectionAdvanced")}>
        <div className="space-y-4">
          {data.advanced.map(block => (
            <div key={block.titleKey}>
              <p className="text-xs uppercase tracking-wider text-zinc-600 mb-2">{tr(block.titleKey)}</p>
              <div className="font-mono text-[11px] text-zinc-500 space-y-1 ltr-mono">
                {block.rows.length === 0 ? (
                  <p>—</p>
                ) : (
                  block.rows.map((row, i) => (
                    <div key={i} className="flex justify-between gap-3 py-1 border-b border-white/[0.03]">
                      <span className="text-zinc-600">{row.label}</span>
                      <span className="text-zinc-400 truncate">{row.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Accordion>
    </div>
  )
}

export function LanguageToggle() {
  const { locale, setLocale, tr } = useLocale()
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "fa" : "en")}
      className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 px-2.5 py-1.5 rounded-full hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08]"
      aria-label="Toggle language"
    >
      <Languages className="size-3.5" />
      <span className="font-medium text-xs">{tr("langToggle")}</span>
    </button>
  )
}
