"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, Copy, Languages } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { countryCodeToFlag } from "@/lib/format"
import {
  runVisibilityAnalysis,
  type LeakFinding,
  type LeakSeverity,
  type SignalIssue,
} from "@/lib/visibility-analyzer-engine"
import { cn } from "@/lib/utils"
import type {
  BrowserDetails,
  ConnectionReport,
  EnvironmentSignals,
  FingerprintData,
  WebRTCData,
} from "@/types/report"

function localizeValue(locale: "en" | "fa", value: string): string {
  if (locale === "en") return value
  const map: Record<string, string> = {
    Enabled: "فعال",
    Disabled: "غیرفعال",
    Available: "در دسترس",
    Blocked: "مسدود",
    Yes: "بله",
    No: "خیر",
    Residential: "مسکونی",
    Datacenter: "دیتاسنتر",
    Mobile: "موبایل",
    Leak: "نشت",
    Safe: "ایمن",
    Active: "فعال",
  }
  return map[value] || value
}

function scoreTone(score: number) {
  if (score >= 75) return { stroke: "#34d399", glow: "shadow-emerald-500/20", text: "text-emerald-400" }
  if (score >= 50) return { stroke: "#fbbf24", glow: "shadow-amber-500/20", text: "text-amber-400" }
  return { stroke: "#fb7185", glow: "shadow-rose-500/20", text: "text-rose-400" }
}

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const tone = scoreTone(score)

  return (
    <div className={cn("relative shrink-0 size-[132px] rounded-full shadow-2xl", tone.glow)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-semibold tabular-nums tracking-tight", tone.text)}>{score}</span>
      </div>
    </div>
  )
}

function SignalCard({ issue, index }: { issue: SignalIssue; index: number }) {
  const { tr } = useLocale()
  const isCritical = issue.severity === "critical"

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
        isCritical
          ? "border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-transparent"
          : "border-amber-500/15 bg-gradient-to-br from-amber-500/[0.06] to-transparent",
      )}
    >
      <div
        className={cn(
          "absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isCritical ? "via-rose-400/40" : "via-amber-400/30",
        )}
      />
      <p className="text-sm font-medium text-zinc-100 mb-4">{tr(issue.messageKey)}</p>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-stretch">
        <SignalPill label={tr(issue.left.labelKey)} value={issue.left.value} />
        <div className="flex items-center justify-center">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border text-xs font-bold",
              isCritical ? "border-rose-500/30 text-rose-400 bg-rose-500/10" : "border-amber-500/25 text-amber-400 bg-amber-500/10",
            )}
          >
            ≠
          </span>
        </div>
        <SignalPill label={tr(issue.right.labelKey)} value={issue.right.value} align="end" />
      </div>

      <p className="mt-4 text-xs text-zinc-500 leading-relaxed">{tr(issue.hintKey)}</p>
    </motion.article>
  )
}

function SignalPill({ label, value, align = "start" }: { label: string; value: string; align?: "start" | "end" }) {
  const { locale } = useLocale()
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 min-w-0",
        align === "end" && "text-end",
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <p className={cn("text-sm text-zinc-100 truncate ltr-mono", locale === "fa" && "font-sans")}>
        {localizeValue(locale, value)}
      </p>
    </div>
  )
}

function ExposureRow({ leak }: { leak: LeakFinding }) {
  const { tr } = useLocale()
  if (leak.severity === "ok") return null

  const styles = {
    critical: "border-rose-500/15 bg-rose-950/20 text-rose-300/90",
    warning: "border-amber-500/15 bg-amber-950/15 text-amber-300/90",
    ok: "",
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-3", styles[leak.severity])}>
      <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-current" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{tr(leak.messageKey)}</p>
        {leak.detail && (
          <p className="text-[11px] font-mono text-zinc-500 mt-1 truncate ltr-mono">{leak.detail}</p>
        )}
      </div>
    </div>
  )
}

function CollapseSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-white/[0.04]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function VisibilityAnalyzer({
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

  const analysis = useMemo(
    () =>
      runVisibilityAnalysis({
        report,
        browser,
        fingerprint,
        webRTC,
        environment: environment || {
          timezone: "—",
          locale: "—",
          languages: [],
          hardwareConcurrency: 0,
          deviceMemory: null,
          touchSupport: false,
          colorDepth: 0,
          doNotTrack: null,
          cookiesEnabled: false,
          localStorage: false,
          sessionStorage: false,
        },
      }),
    [report, browser, fingerprint, webRTC, environment],
  )

  const heroSummary =
    analysis.consistencyScore >= 75 ? tr("heroGood") : analysis.consistencyScore >= 50 ? tr("heroWarn") : tr("heroBad")

  const exposureLeaks = analysis.leaks.filter(l => l.severity !== "ok")
  const hasExposure = exposureLeaks.length > 0

  const keyVisibility = analysis.visibility.slice(0, 8)

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Hero */}
      <section className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center gap-8 sm:gap-10">
          <ScoreRing score={analysis.consistencyScore} />

          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">{tr("tagline")}</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-zinc-50 tracking-tight leading-tight">
                {tr("heroConsistency")}
              </h1>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-md">{tr("heroFocus")}</p>
            </div>

            <p className={cn("text-sm leading-relaxed", scoreTone(analysis.consistencyScore).text)}>
              {heroSummary}
            </p>

            <button
              type="button"
              onClick={onCopyIp}
              className="group inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-lg leading-none">{countryCodeToFlag(report.country_code)}</span>
              <span className="font-mono text-sm text-zinc-100 ltr-mono">{report.ip}</span>
              <Copy className="size-3.5 text-zinc-600 group-hover:text-zinc-400" />
              {copied && <span className="text-xs text-emerald-500">{tr("copied")}</span>}
            </button>
          </div>
        </div>
      </section>

      {/* Signal mismatches — primary focus */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{tr("sectionSignals")}</h2>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{tr("sectionSignalsDesc")}</p>
        </div>

        {analysis.signalIssues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Check className="size-4" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-300">{tr("noMismatches")}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{tr("noMismatchesHint")}</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {analysis.signalIssues.map((issue, i) => (
              <SignalCard key={issue.id} issue={issue} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Exposure paths — compact */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{tr("sectionExposure")}</h2>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{tr("sectionExposureDesc")}</p>
        </div>

        {!hasExposure ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500 px-1">
            <Check className="size-4 text-emerald-500/80 shrink-0" />
            {tr("exposureClear")}
          </div>
        ) : (
          <div className="space-y-2">
            {exposureLeaks.map(leak => (
              <ExposureRow key={leak.id} leak={leak} />
            ))}
          </div>
        )}

        {webRTC && webRTC.iceCandidates.length > 0 && (
          <CollapseSection title={tr("iceCandidates")}>
            <div className="space-y-1 font-mono text-xs text-zinc-500 ltr-mono max-h-48 overflow-y-auto">
              {webRTC.iceCandidates.map((c, i) => (
                <div key={i} className="flex gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-zinc-600 w-14 shrink-0">{c.type}</span>
                  <span className="text-zinc-400 truncate">{c.ip}</span>
                </div>
              ))}
            </div>
          </CollapseSection>
        )}
      </section>

      {/* Collapsible: what websites see */}
      <CollapseSection title={tr("showMore")}>
        <div className="grid gap-px rounded-xl overflow-hidden bg-white/[0.04] mt-4">
          {keyVisibility.map(item => (
            <div key={item.labelKey} className="flex items-center justify-between gap-4 bg-[#09090b] px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <p className="text-sm text-zinc-300">{tr(item.labelKey)}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5 hidden sm:block">{tr(item.hintKey)}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-mono text-zinc-500 shrink-0 max-w-[45%] truncate ltr-mono text-end",
                  rtl && "text-left",
                )}
              >
                {localizeValue(locale, item.value)}
              </span>
            </div>
          ))}
        </div>
      </CollapseSection>

      {/* Collapsible: technical identity */}
      <CollapseSection title={tr("showTechnical")}>
        <div className="grid sm:grid-cols-2 gap-6 mt-4">
          <dl className="space-y-0">
            <p className="text-xs uppercase tracking-wider text-zinc-600 mb-3">{tr("sectionNetwork")}</p>
            {analysis.networkIdentity.map(row => (
              <div key={row.labelKey} className="flex justify-between gap-3 py-2.5 border-b border-white/[0.04] text-sm">
                <dt className="text-zinc-500">{tr(row.labelKey)}</dt>
                <dd className="text-zinc-300 text-end truncate ltr-mono">{localizeValue(locale, row.value)}</dd>
              </div>
            ))}
          </dl>
          <dl className="space-y-0">
            <p className="text-xs uppercase tracking-wider text-zinc-600 mb-3">{tr("sectionBrowser")}</p>
            {analysis.browserIdentity.map(row => (
              <div key={row.labelKey} className="flex justify-between gap-3 py-2.5 border-b border-white/[0.04] text-sm">
                <dt className="text-zinc-500">{tr(row.labelKey)}</dt>
                <dd className="text-zinc-300 text-end truncate">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CollapseSection>
    </div>
  )
}

export function LanguageToggle() {
  const { locale, setLocale, tr } = useLocale()

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "fa" : "en")}
      className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors px-2.5 py-1.5 rounded-full border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]"
      aria-label="Toggle language"
    >
      <Languages className="size-3.5" />
      <span className="font-medium text-xs">{tr("langToggle")}</span>
    </button>
  )
}
