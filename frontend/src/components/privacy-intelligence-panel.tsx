"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Shield,
  ShieldAlert,
  Sparkles,
  Tv,
} from "lucide-react"
import {
  analyzePrivacyExposure,
  getIdentityExposureLevel,
  getSeverityStyles,
  getToneStyles,
} from "@/lib/exposure-engine"
import { cn } from "@/lib/utils"
import type { PrivacyAnalysis, ServiceCompatibility } from "@/types/exposure"
import type {
  BrowserDetails,
  ConnectionReport,
  FingerprintData,
  ServiceStatus,
  WebRTCData,
} from "@/types/report"

function ScoreRing({
  value,
  label,
  sublabel,
  stroke,
  inverted,
}: {
  value: number
  label: string
  sublabel: string
  stroke: string
  inverted?: boolean
}) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative size-28 shrink-0 flex items-center justify-center">
      <svg className="size-full -rotate-90 absolute" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className={cn("text-2xl font-black tabular-nums", inverted ? "text-rose-400" : "text-emerald-400")}>
          {value}
        </span>
        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
        <span className="text-[7px] text-slate-600 uppercase tracking-wider mt-0.5">{sublabel}</span>
      </div>
    </div>
  )
}

function ServiceBadge({ service }: { service: ServiceCompatibility }) {
  const styles = {
    compatible: "border-emerald-500/20 bg-emerald-950/20 text-emerald-400",
    limited: "border-amber-500/20 bg-amber-950/20 text-amber-400",
    blocked: "border-rose-500/20 bg-rose-950/20 text-rose-400",
    unknown: "border-white/10 bg-white/[0.03] text-slate-400",
  }
  const labels = {
    compatible: "Compatible",
    limited: "Limited",
    blocked: "Blocked",
    unknown: "Unknown",
  }

  return (
    <div className={cn("rounded-xl border p-4 space-y-2", styles[service.status])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100">{service.label}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{labels[service.status]}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{service.explanation}</p>
    </div>
  )
}

function DimensionCard({
  title,
  headline,
  explanation,
  protectionScore,
  severity,
  defaultOpen = false,
}: {
  title: string
  headline: string
  explanation: string
  protectionScore: number
  severity: PrivacyAnalysis["dimensions"][0]["severity"]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const sev = getSeverityStyles(severity)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/60 overflow-hidden hover:border-white/[0.1] transition-colors">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 text-left flex items-start justify-between gap-4"
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", sev.text, "bg-white/[0.03]")}>
              {sev.label}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 leading-snug">{headline}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-lg font-black tabular-nums text-slate-100">{protectionScore}</span>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">Protection</p>
          </div>
          <span className={cn("size-2 rounded-full", sev.dot)} />
          <ChevronDown className={cn("size-4 text-slate-500 transition-transform", open && "rotate-180")} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/[0.05] pt-3">
              {explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PrivacyIntelligencePanel({
  report,
  browser,
  fingerprint,
  webRTC,
  webrtcStatus,
  services,
}: {
  report: ConnectionReport
  browser: BrowserDetails | null
  fingerprint: FingerprintData | null
  webRTC: WebRTCData | null
  webrtcStatus: WebRTCData["status"]
  services: Record<string, ServiceStatus>
}) {
  const analysis = analyzePrivacyExposure({
    report,
    browser,
    fingerprint,
    webRTC,
    webrtcStatus,
    services,
  })

  const tone = getToneStyles(analysis.tone)
  const identityLevel = getIdentityExposureLevel(analysis.identityExposureScore)
  const tunneled = report.vpn || report.proxy || report.tor

  return (
    <div className="space-y-8">
      {/* Hero: Privacy Intelligence */}
      <div className={cn("rounded-3xl border p-6 md:p-8 shadow-xl relative overflow-hidden", tone.border, tone.bg)}>
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: `radial-gradient(600px circle at 80% 20%, ${tone.glow}, transparent 60%)` }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Privacy Intelligence
              </span>
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-black tracking-tight", tone.text)}>
              {analysis.verdict}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-2xl">{analysis.summary}</p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs px-3 py-1.5 rounded-full bg-black/30 border border-white/[0.06] text-slate-300">
                Identity exposure: <strong className="text-slate-100">{identityLevel}</strong>
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-black/30 border border-white/[0.06] text-slate-300">
                {tunneled ? "VPN / tunnel active" : "Direct connection"}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-black/30 border border-white/[0.06] text-slate-300">
                Exit: {report.country || "Unknown"}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-6">
            <ScoreRing
              value={analysis.privacyScore}
              label="Privacy"
              sublabel="Protection"
              stroke="#10b981"
            />
            <ScoreRing
              value={analysis.identityExposureScore}
              label="Exposure"
              sublabel="Identity"
              stroke="#f43f5e"
              inverted
            />
          </div>
        </div>
      </div>

      {/* Plain English narrative */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/70 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100">What this means for you</h2>
        </div>
        <ul className="space-y-2.5">
          {analysis.narrative.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
              <span className="text-indigo-400 shrink-0 mt-0.5">→</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Protected vs Exposed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Lock className="size-3.5" />
            {tunneled ? "Successfully hidden" : "Limited protection"}
          </p>
          <ul className="space-y-2">
            {analysis.protectedItems.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                <EyeOff className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-500/15 bg-rose-950/10 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <Eye className="size-3.5" />
            Still visible to websites
          </p>
          <ul className="space-y-2">
            {analysis.exposedItems.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                <Eye className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Service compatibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
            <Bot className="size-3.5" />
            AI Services Compatibility
          </p>
          <div className="space-y-3">
            {analysis.aiServices.map(s => (
              <ServiceBadge key={s.id} service={s} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
            <Tv className="size-3.5" />
            Streaming Services Compatibility
          </p>
          <div className="space-y-3">
            {analysis.streamingServices.map(s => (
              <ServiceBadge key={s.id} service={s} />
            ))}
          </div>
        </div>
      </div>

      {/* Exposure dimensions */}
      <div className="space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">
          Exposure Analysis Engine
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {analysis.dimensions.map(dim => (
            <DimensionCard
              key={dim.id}
              title={dim.title}
              headline={dim.headline}
              explanation={dim.explanation}
              protectionScore={dim.protectionScore}
              severity={dim.severity}
              defaultOpen={dim.severity === "high" || dim.severity === "critical"}
            />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-950/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-400">Recommended actions</h3>
          </div>
          <ul className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300">
                <span className="text-amber-500 font-mono font-bold shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
