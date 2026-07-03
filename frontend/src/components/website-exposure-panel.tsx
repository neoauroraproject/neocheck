"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Eye, MapPin, Monitor, Wifi } from "lucide-react"
import {
  buildCasualExposureSummary,
  countryCodeToFlag,
  exposureLevelMeta,
  type ExposureItem,
  type VerdictTone,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BrowserDetails, ConnectionReport, WebRTCData } from "@/types/report"

const verdictStyles: Record<VerdictTone, { badge: string; bar: string; glow: string }> = {
  good: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    bar: "bg-emerald-500",
    glow: "from-emerald-500/20 to-transparent",
  },
  medium: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    bar: "bg-amber-500",
    glow: "from-amber-500/20 to-transparent",
  },
  bad: {
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    bar: "bg-rose-500",
    glow: "from-rose-500/20 to-transparent",
  },
}

function SnapshotTile({
  icon: Icon,
  title,
  value,
  sub,
}: {
  icon: React.ElementType
  title: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.03] p-3.5 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-3.5 text-[var(--muted)] shrink-0" strokeWidth={2} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">{title}</span>
      </div>
      <p className="text-[13px] font-semibold truncate">{value}</p>
      <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{sub}</p>
    </div>
  )
}

function DetailRow({ label, value, level }: ExposureItem) {
  const meta = exposureLevelMeta[level]
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-[11px] text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-mono truncate">{value}</span>
        <span className={cn("size-1.5 rounded-full shrink-0", meta.dot)} title={meta.label} />
      </div>
    </div>
  )
}

export function WebsiteExposurePanel({
  report,
  browser,
  webRTC,
  webrtcStatus,
  exposureItems,
  countryCode,
}: {
  report: ConnectionReport
  browser: BrowserDetails | null
  webRTC: WebRTCData | null
  webrtcStatus: WebRTCData["status"]
  exposureItems: ExposureItem[]
  countryCode?: string
}) {
  const [showDetails, setShowDetails] = useState(false)

  const exposedCount = exposureItems.filter(i => i.level === "exact").length
  const summary = buildCasualExposureSummary(
    report,
    browser,
    webRTC,
    webrtcStatus,
    exposedCount,
    exposureItems.length,
  )
  const styles = verdictStyles[summary.tone]
  const flag = countryCodeToFlag(countryCode)
  const protectedPercent = 100 - summary.visiblePercent

  return (
    <section className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-32 bg-gradient-to-b pointer-events-none", styles.glow)} />

      <div className="relative p-5 sm:p-6 space-y-5">
        {/* Header + verdict */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="size-4 text-[var(--muted)]" />
              <h2 className="text-sm font-semibold">How websites see you</h2>
            </div>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed max-w-[260px]">
              What any site learns the moment you open a page — no permission asked.
            </p>
          </div>
          <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0", styles.badge)}>
            {summary.verdict}
          </span>
        </div>

        {/* Exposure meter */}
        <div>
          <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">
            <span>Visible to sites</span>
            <span>{summary.visiblePercent}% exposed</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden flex">
            <motion.div
              className={cn("h-full rounded-l-full", styles.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${summary.visiblePercent}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="flex-1 bg-emerald-500/30" title={`${protectedPercent}% protected`} />
          </div>
          <p className="text-[12px] text-[var(--muted)] mt-2">{summary.verdictDetail}</p>
        </div>

        {/* 3 quick snapshots */}
        <div className="grid grid-cols-3 gap-2">
          <SnapshotTile icon={MapPin} title="Location" value={`${flag} ${summary.location.value}`} sub={summary.location.sub} />
          <SnapshotTile icon={Monitor} title="Device" value={summary.device.value} sub={summary.device.sub} />
          <SnapshotTile icon={Wifi} title="Network" value={summary.network.value} sub={summary.network.sub} />
        </div>

        {/* Plain-language lists */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.03] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2.5">
              Sites can see
            </p>
            <ul className="space-y-2">
              {summary.canSee.map((item, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-snug">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2.5">
              You&apos;re protected from
            </p>
            <ul className="space-y-2">
              {summary.cantSee.map((item, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-snug">
                  <span className="shrink-0 text-emerald-500">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pro details — collapsed */}
        <div className="border-t border-[var(--border)] pt-1">
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center gap-2 py-2.5 text-left text-[12px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", showDetails && "rotate-180")} />
            <span>{showDetails ? "Hide" : "Show"} full data breakdown ({exposureItems.length} signals)</span>
          </button>
          <AnimatePresence initial={false}>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-1 pt-1">
                  <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-[var(--muted)]">
                    {(Object.entries(exposureLevelMeta) as [keyof typeof exposureLevelMeta, typeof exposureLevelMeta.exact][]).map(([k, m]) => (
                      <span key={k} className="flex items-center gap-1">
                        <span className={cn("size-1.5 rounded-full", m.dot)} /> {m.label}
                      </span>
                    ))}
                  </div>
                  {exposureItems.map(item => (
                    <DetailRow key={item.label} {...item} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
