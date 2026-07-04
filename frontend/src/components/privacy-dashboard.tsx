"use client"

import { useMemo, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  Globe,
  KeyRound,
  Languages,
  Lock,
  Monitor,
  Radio,
  Server,
  ShieldCheck,
  Wifi,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { useLocale } from "@/components/locale-provider"
import { isDnsLeak, isDnsSafe } from "@/lib/format"
import type { TranslationKey } from "@/lib/i18n/translations"
import { analyzeLeaks, type SignalIssue } from "@/lib/visibility-analyzer-engine"
import {
  runPrivacyPlatformAnalysis,
  type CompatLevel,
  type LeakVerdict,
  type VisibilityField,
  type VisibilityLevel,
} from "@/lib/privacy-platform-engine"
import { cn } from "@/lib/utils"
import type {
  BrowserDetails,
  ConnectionReport,
  ConnectionClassification,
  EnvironmentSignals,
  FingerprintData,
  FraudProviderInsight,
  ServiceStatus,
  TLSLayerInfo,
  TLSDiagnostics,
  WebRTCData,
} from "@/types/report"

type MetricTone = "ok" | "warn" | "bad" | "neutral"

interface MetricCardData {
  id: string
  icon: LucideIcon
  tone: MetricTone
  titleKey: TranslationKey
  statusKey?: TranslationKey
  statusText?: string
  descKey: TranslationKey
}

function scoreTone(score: number) {
  if (score >= 75) return { stroke: "#34d399", text: "text-emerald-400" }
  if (score >= 50) return { stroke: "#fbbf24", text: "text-amber-400" }
  return { stroke: "#fb7185", text: "text-rose-400" }
}

function metricToneStyles(tone: MetricTone) {
  const map = {
    ok: { ring: "bg-emerald-500/15 text-emerald-400", status: "text-emerald-400" },
    warn: { ring: "bg-amber-500/15 text-amber-400", status: "text-amber-400" },
    bad: { ring: "bg-rose-500/15 text-rose-400", status: "text-rose-400" },
    neutral: { ring: "bg-zinc-500/15 text-zinc-400", status: "text-zinc-300" },
  }
  return map[tone]
}

function Card({
  children,
  className,
  accent,
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  accent?: boolean
  padding?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-2xl nc-card backdrop-blur-sm",
        accent ? "card-glow-accent" : "card-glow",
        padding && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const tone = scoreTone(score)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke={tone.stroke} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-semibold tabular-nums tracking-tight", tone.text)}>{score}</span>
      </div>
    </div>
  )
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  const { tr } = useLocale()
  const styles = metricToneStyles(metric.tone)
  const Icon = metric.icon

  return (
    <div className="rounded-2xl nc-card p-4 sm:p-5 card-glow h-full flex flex-col">
      <div className="flex items-start gap-3.5 mb-3">
        <div className={cn("size-10 rounded-full flex items-center justify-center shrink-0", styles.ring)}>
          <Icon className="size-[18px]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-nc-secondary">{tr(metric.titleKey)}</p>
          <p className={cn("text-sm font-semibold mt-0.5", styles.status)}>
            {metric.statusText ?? (metric.statusKey ? tr(metric.statusKey) : "—")}
          </p>
        </div>
      </div>
      <p className="text-xs text-nc-muted leading-relaxed mt-auto">{tr(metric.descKey)}</p>
    </div>
  )
}

function InfoBarItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 sm:px-5 py-3.5 sm:py-4 min-w-0 bg-nc-cell">
      <p className="text-[10px] uppercase tracking-wider text-nc-faint mb-1">{label}</p>
      <p className="text-sm text-nc-secondary truncate ltr-mono">{value}</p>
    </div>
  )
}

function layerTlsDisplay(layer: TLSLayerInfo, tr: (key: TranslationKey) => string): string {
  if (layer.tls_version) return layer.tls_version
  if (layer.label) return tr(layer.label as TranslationKey)
  return "—"
}

function evLabel(key: string, tr: (k: TranslationKey) => string): string {
  const text = tr(key as TranslationKey)
  return text || key.replace(/^ev/, "").replace(/([A-Z])/g, " $1").trim()
}

function narrativeHighlight(className?: string) {
  return cn("text-nc-primary font-medium", className)
}

function WebsitePerspectiveCard({
  report,
  browser,
  connectionTypeKey,
}: {
  report: ConnectionReport
  browser: BrowserDetails | null
  connectionTypeKey: TranslationKey
}) {
  const { tr, locale } = useLocale()

  const browserName = browser?.name
    ? `${browser.name}${browser.version ? ` ${browser.version}` : ""}`
    : report.browser
      ? `${report.browser}${report.browser_version ? ` ${report.browser_version}` : ""}`
      : tr("websiteFallbackBrowser")
  const osName = browser?.os || report.operating_system || tr("websiteFallbackOs")
  const ip = report.ip || "—"
  const location = [report.city, report.region, report.country].filter(Boolean).join(", ") || tr("websiteFallbackLocation")
  const connType = tr(connectionTypeKey)
  const isp = report.isp || report.organization || tr("websiteFallbackIsp")
  const Hi = ({ children, mono }: { children: ReactNode; mono?: boolean }) => (
    <span className={narrativeHighlight(mono ? "font-mono" : undefined)}>{children}</span>
  )

  return (
    <Card className="h-full flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-8 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
          <Eye className="size-4" strokeWidth={2} />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-nc-muted">{tr("websitePerspectiveTitle")}</p>
      </div>
      <p className="text-base sm:text-lg leading-relaxed sm:leading-8 text-nc-muted">
        {locale === "fa" ? (
          <>
            {tr("websiteNarrativeLead")} <Hi>{browserName}</Hi> {tr("websiteNarrativeOn")} <Hi>{osName}</Hi>،{" "}
            {tr("websiteNarrativeUsingIp")} <Hi mono>{ip}</Hi> {tr("websiteNarrativeFrom")} <Hi>{location}</Hi>{" "}
            {tr("websiteNarrativeSee")} <Hi>{connType}</Hi> {tr("websiteNarrativeConnection")} <Hi>{isp}</Hi>{" "}
            {tr("websiteNarrativeEnd")}
          </>
        ) : (
          <>
            {tr("websiteNarrativeLead")} <Hi>{browserName}</Hi> {tr("websiteNarrativeOn")} <Hi>{osName}</Hi>,{" "}
            {tr("websiteNarrativeUsingIp")} <Hi mono>{ip}</Hi> {tr("websiteNarrativeFrom")} <Hi>{location}</Hi>.{" "}
            {tr("websiteNarrativeSee")} <Hi>{connType}</Hi> {tr("websiteNarrativeConnection")} <Hi>{isp}</Hi>
            {tr("websiteNarrativeEnd")}
          </>
        )}
      </p>
    </Card>
  )
}

function ConnectionClassificationPanel({ data }: { data: ConnectionClassification }) {
  const { tr } = useLocale()
  const [open, setOpen] = useState(false)

  return (
    <Card className="h-full flex flex-col" padding={false}>
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-nc-faint">{tr("connectionType")}</p>
            <p className="text-lg font-semibold text-nc-primary mt-1 leading-snug">{tr(data.label_key as TranslationKey)}</p>
          </div>
          {data.provider_count > 0 && (
            <span className="text-[10px] text-nc-faint px-2 py-0.5 rounded-full border border-nc-divider bg-nc-inset shrink-0">
              {data.provider_count} src
            </span>
          )}
        </div>

        <p className="text-xs text-nc-muted">
          {tr("classificationConfidence")}: <span className="font-semibold tabular-nums text-nc-secondary">{data.confidence}%</span>
        </p>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-400 transition-colors mt-auto pt-4"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          {tr("classificationWhy")}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="classification-why"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-nc-divider"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {data.evidence?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-nc-faint mb-2">Evidence</p>
                  <ul className="space-y-1">
                    {data.evidence.map((item, i) => (
                      <li key={`${item.key}-${i}`} className="flex items-start gap-2 text-xs text-nc-muted">
                        <Check className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                        {evLabel(item.key, tr)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-nc-faint mb-2">{tr("classificationProviders")}</p>
                <div className="space-y-2">
                  {(data.providers ?? []).filter(p => p.id !== "neocheck").map(provider => (
                    <div key={provider.id} className="rounded-lg border border-nc-divider bg-nc-inset px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-medium text-nc-secondary">{provider.name}</p>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border",
                          provider.queried ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-nc-faint border-nc-divider",
                        )}>
                          {provider.queried ? "Live" : provider.active ? "Active" : "Off"}
                        </span>
                      </div>
                      {(provider.signals ?? []).length > 0 ? (
                        <ul className="space-y-0.5">
                          {(provider.signals ?? []).map((sig, i) => (
                            <li key={`${provider.id}-${sig.key}-${i}`} className="text-[11px] text-nc-muted">· {evLabel(sig.key, tr)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-nc-faint">{tr("classificationNoProvider")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function layerNote(layer: TLSLayerInfo, tr: (key: TranslationKey) => string): string | null {
  if (!layer.note) return null
  return tr(layer.note as TranslationKey)
}

function TLSLayerCard({ title, layer, tr }: { title: string; layer: TLSLayerInfo; tr: (key: TranslationKey) => string }) {
  return (
    <div className="rounded-xl border border-nc-divider bg-nc-inset p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-nc-secondary">{title}</p>
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full border",
          layer.encrypted ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-nc-muted border-nc-divider bg-nc-hover",
        )}>
          {layer.encrypted ? "HTTPS" : "HTTP"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-nc-faint mb-0.5">TLS</p>
          <p className="text-nc-secondary font-medium">{layerTlsDisplay(layer, tr)}</p>
        </div>
        <div>
          <p className="text-nc-faint mb-0.5">HTTP</p>
          <p className="text-nc-secondary">{layer.http_version || "—"}</p>
        </div>
        {layer.cipher_suite && (
          <div className="col-span-2">
            <p className="text-nc-faint mb-0.5">Cipher</p>
            <p className="text-nc-muted font-mono text-[11px] ltr-mono truncate">{layer.cipher_suite}</p>
          </div>
        )}
      </div>
      {layerNote(layer, tr) && (
        <p className="text-[11px] text-nc-faint leading-relaxed border-t border-nc-divider pt-2">{layerNote(layer, tr)}</p>
      )}
    </div>
  )
}

function TLSDiagnosticsPanel({ diag }: { diag: TLSDiagnostics }) {
  const { tr } = useLocale()

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-nc-muted">{tr("tlsSectionTitle")}</p>
          {diag.behind_reverse_proxy && (
            <p className="text-xs text-nc-faint mt-1">
              {diag.proxy_signals.length > 0 ? diag.proxy_signals.join(" · ") : tr("tlsProxyHandled")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "text-[10px] font-medium px-2.5 py-1 rounded-full border",
            diag.hsts ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-nc-muted border-nc-divider",
          )}>
            {diag.hsts ? tr("tlsHsts") : tr("tlsHstsOff")}
          </span>
          {diag.http3_available && (
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-full border text-violet-500 border-violet-500/20 bg-violet-500/10">
              {tr("tlsHttp3")}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-nc-muted leading-relaxed mb-4">{tr(diag.explanation_key as TranslationKey)}</p>

      <div className="grid md:grid-cols-2 gap-3">
        <TLSLayerCard title={tr("tlsClientConnection")} layer={diag.client} tr={tr} />
        <TLSLayerCard title={tr("tlsBackendConnection")} layer={diag.backend} tr={tr} />
      </div>
    </Card>
  )
}

function FraudProvidersPanel({ providers }: { providers: FraudProviderInsight[] }) {
  const { tr } = useLocale()
  const active = providers.filter(p => p.active)
  if (active.length === 0) return null

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-nc-muted">{tr("sectionFraudProviders")}</p>
          <p className="text-xs text-nc-faint mt-1">{tr("fraudSourcesActive").replace("{count}", String(active.length))}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
          <KeyRound className="size-3" />
          {tr("fraudLiveCheck")}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {active.map(provider => {
          let status = tr("fraudReady")
          let statusClass = "text-nc-muted"
          let score: string | null = null

          if (!provider.implemented) {
            status = tr("fraudPendingIntegration")
            statusClass = "text-amber-500"
          } else if (provider.error) {
            status = tr("fraudProviderError")
            statusClass = "text-rose-500"
          } else if (provider.queried && provider.risk_score != null) {
            status = tr("fraudLiveCheck")
            statusClass = "text-emerald-500"
            score = `${provider.risk_score}/100`
          }

          return (
            <div key={provider.id} className="rounded-xl border border-nc-divider bg-nc-inset px-4 py-3.5 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-nc-secondary truncate">{provider.name}</p>
                {score && <span className="text-sm font-semibold tabular-nums text-nc-primary shrink-0">{score}</span>}
              </div>
              <p className={cn("text-xs font-medium", statusClass)}>{status}</p>
              {provider.error && (
                <p className="text-[11px] text-nc-faint mt-1 truncate" title={provider.error}>{provider.error}</p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SignalCard({ issue }: { issue: SignalIssue }) {
  const { tr } = useLocale()
  const critical = issue.severity === "critical"

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 sm:p-4",
        critical ? "border-rose-500/15 bg-rose-500/[0.06]" : "border-amber-500/12 bg-amber-500/[0.04]",
      )}
    >
      <p className="text-sm text-nc-secondary mb-3 leading-snug">{tr(issue.messageKey)}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-center">
        <div className="rounded-lg bg-nc-inset border border-nc-divider px-2 py-2 min-w-0">
          <p className="text-[10px] text-nc-faint mb-0.5 truncate">{tr(issue.left.labelKey)}</p>
          <p className="text-xs text-nc-secondary truncate ltr-mono">{issue.left.value}</p>
        </div>
        <span className={cn("text-xs font-bold", critical ? "text-rose-400" : "text-amber-400")}>≠</span>
        <div className="rounded-lg bg-nc-inset border border-nc-divider px-2 py-2 min-w-0">
          <p className="text-[10px] text-nc-faint mb-0.5 truncate">{tr(issue.right.labelKey)}</p>
          <p className="text-xs text-nc-secondary truncate ltr-mono">{issue.right.value}</p>
        </div>
      </div>
    </div>
  )
}

function LevelDot({ level }: { level: VisibilityLevel }) {
  const c = level === "visible" ? "bg-emerald-400" : level === "partial" ? "bg-amber-400" : "bg-zinc-600"
  return <span className={cn("size-1.5 rounded-full shrink-0 mt-1.5", c)} />
}

function formatVisValue(value: string, tr: (key: TranslationKey) => string): string {
  if (value.startsWith("tls") && value in { tlsProxyHandled: 1, tlsForwardedInfo: 1, tlsUnavailableBackend: 1 }) {
    return tr(value as TranslationKey)
  }
  return value
}

function VisibilityGroup({ title, items }: { title: string; items: VisibilityField[] }) {
  const { tr, rtl } = useLocale()
  if (items.length === 0) return null

  return (
    <div>
      <p className="text-[11px] font-medium text-nc-faint mb-2">{title}</p>
      <div className="grid sm:grid-cols-2 gap-px rounded-xl overflow-hidden bg-nc-grid">
        {items.map(item => (
          <div key={item.id} className="flex gap-2.5 bg-nc-cell px-3 py-2.5 min-w-0">
            <LevelDot level={item.level} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-nc-muted truncate">{tr(item.labelKey)}</p>
              <p className={cn("text-[11px] font-mono text-nc-faint truncate mt-0.5 ltr-mono", rtl && "text-left")}>
                {formatVisValue(item.value, tr)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Accordion({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Card padding={false} className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-start hover:bg-nc-hover transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-nc-secondary">{title}</p>
          {subtitle && <p className="text-xs text-nc-faint mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown className={cn("size-4 text-nc-muted shrink-0 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="accordion-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-nc-divider">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function CompatPill({ level }: { level: CompatLevel }) {
  const { tr } = useLocale()
  const map = {
    likely: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    limited: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    unknown: "text-zinc-500 bg-zinc-500/10 border-zinc-500/15",
  }
  const key = level === "likely" ? "compatLikely" : level === "limited" ? "compatLimited" : "compatUnknown"
  return <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", map[level])}>{tr(key)}</span>
}

const VIS_GROUPS: { titleKey: string; ids: string[] }[] = [
  { titleKey: "Network", ids: ["ip", "loc", "country", "city", "asn", "isp", "rdns", "v4", "v6"] },
  { titleKey: "Browser", ids: ["browser", "bver", "os", "arch", "lang", "alang", "tz", "screen", "ua"] },
  { titleKey: "Fingerprint", ids: ["canvas", "webgl", "audio", "webgpu", "hw", "mem", "color", "touch"] },
  { titleKey: "Security", ids: ["cookies", "dnt", "tls", "http", "cipher", "js", "perm", "media"] },
]

function buildMetrics(
  report: ConnectionReport,
  leakVerdict: LeakVerdict,
  tr: (key: TranslationKey) => string,
): MetricCardData[] {
  const liveFraud = (report.fraud_providers ?? []).filter(p => p.active && p.queried && p.risk_score != null)
  const hasLiveFraud = liveFraud.length > 0

  const repScore = report.risk_score
  let repTone: MetricTone = "ok"
  let repStatus: TranslationKey = "statusSafe"
  let repDesc: TranslationKey = hasLiveFraud ? "descRepLive" : "descRepClean"
  let repStatusText: string | undefined = hasLiveFraud ? `${repScore}/100` : undefined

  if (repScore >= 70) {
    repTone = "bad"
    repStatus = "statusRisk"
    repDesc = hasLiveFraud ? "descRepLive" : "descRepHigh"
  } else if (repScore >= 40) {
    repTone = "warn"
    repStatus = "statusWarning"
    repDesc = hasLiveFraud ? "descRepLive" : "descRepElevated"
  }

  let tunnelTone: MetricTone = "ok"
  let tunnelStatus: TranslationKey = "statusNotDetected"
  let tunnelDesc: TranslationKey = "descTunnelNone"
  if (report.tor) {
    tunnelTone = "warn"
    tunnelStatus = "statusDetected"
    tunnelDesc = "descTunnelTor"
  } else if (report.proxy) {
    tunnelTone = "warn"
    tunnelStatus = "statusDetected"
    tunnelDesc = "descTunnelProxy"
  } else if (report.vpn) {
    tunnelTone = "warn"
    tunnelStatus = "statusDetected"
    tunnelDesc = "descTunnelVpn"
  }

  let webrtcTone: MetricTone = "ok"
  let webrtcStatus: TranslationKey = "statusSafe"
  let webrtcDesc: TranslationKey = "descWebrtcClear"
  if (leakVerdict === "critical") {
    webrtcTone = "bad"
    webrtcStatus = "statusRisk"
    webrtcDesc = "descWebrtcLeak"
  } else if (leakVerdict === "warning") {
    webrtcTone = "warn"
    webrtcStatus = "statusWarning"
    webrtcDesc = "descWebrtcPartial"
  }

  let dnsTone: MetricTone = "neutral"
  let dnsStatus: TranslationKey = "statusUnknown"
  let dnsDesc: TranslationKey = "descDnsUnknown"
  if (isDnsSafe(report.dns_leak)) {
    dnsTone = "ok"
    dnsStatus = "statusSafe"
    dnsDesc = "descDnsSafe"
  } else if (isDnsLeak(report.dns_leak)) {
    dnsTone = "bad"
    dnsStatus = "statusRisk"
    dnsDesc = "descDnsLeak"
  }

  let ipv6Tone: MetricTone = "ok"
  let ipv6Status: TranslationKey = "statusInactive"
  let ipv6Desc: TranslationKey = "descIpv6Off"
  if (report.ipv6) {
    ipv6Tone = report.vpn || report.proxy ? "warn" : "neutral"
    ipv6Status = "statusActive"
    ipv6Desc = report.vpn || report.proxy ? "descIpv6Leak" : "descIpv6On"
  }

  const diag = report.tls_diagnostics
  const clientTls = diag?.client.tls_version || ""
  const tlsEncrypted = diag?.client.encrypted ?? report.https
  const tlsBehindProxy = diag?.behind_reverse_proxy ?? false

  let tlsTone: MetricTone = "neutral"
  let tlsStatus: TranslationKey = "statusMissing"
  let tlsDesc: TranslationKey = "descTlsMissing"
  let tlsStatusText: string | undefined

  if (clientTls.includes("1.3")) {
    tlsTone = "ok"
    tlsStatus = "statusModern"
    tlsDesc = "descTlsModern"
    tlsStatusText = clientTls
  } else if (clientTls.includes("1.2")) {
    tlsTone = "ok"
    tlsStatus = "statusSafe"
    tlsDesc = "descTlsOk"
    tlsStatusText = clientTls
  } else if (clientTls) {
    tlsTone = "warn"
    tlsStatus = "statusLegacy"
    tlsDesc = "descTlsOk"
    tlsStatusText = clientTls
  } else if (tlsEncrypted && tlsBehindProxy) {
    tlsTone = "ok"
    tlsStatusText = tr("tlsProxyHandled")
    tlsDesc = "descTlsProxy"
  } else if (tlsEncrypted) {
    tlsTone = "ok"
    tlsStatus = "statusSafe"
    tlsDesc = "descTlsOk"
    tlsStatusText = tr("tlsForwardedInfo")
  }

  const http = diag?.client.http_version || report.http_version || ""
  let httpTone: MetricTone = "neutral"
  let httpStatus: TranslationKey = "statusUnknown"
  let httpDesc: TranslationKey = "descHttpUnknown"
  if (http.includes("3") || http.includes("2")) {
    httpTone = "ok"
    httpStatus = "statusModern"
    httpDesc = "descHttpModern"
  } else if (http.includes("1")) {
    httpTone = "warn"
    httpStatus = "statusLegacy"
    httpDesc = "descHttpLegacy"
  }

  const browserLabel = [report.browser, report.browser_version].filter(Boolean).join(" ") || "—"

  return [
    { id: "rep", icon: ShieldCheck, tone: repTone, titleKey: "metricIpReputation", statusKey: repStatus, statusText: repStatusText, descKey: repDesc },
    { id: "tunnel", icon: Wifi, tone: tunnelTone, titleKey: "metricVpnProxy", statusKey: tunnelStatus, descKey: tunnelDesc },
    { id: "webrtc", icon: Radio, tone: webrtcTone, titleKey: "metricWebrtc", statusKey: webrtcStatus, descKey: webrtcDesc },
    { id: "dns", icon: Server, tone: dnsTone, titleKey: "metricDns", statusKey: dnsStatus, descKey: dnsDesc },
    { id: "ipv6", icon: Globe, tone: ipv6Tone, titleKey: "metricIpv6", statusKey: ipv6Status, descKey: ipv6Desc },
    { id: "tls", icon: Lock, tone: tlsTone, titleKey: "metricTls", statusKey: tlsStatus, statusText: tlsStatusText, descKey: tlsDesc },
    { id: "http", icon: Zap, tone: httpTone, titleKey: "metricHttp", statusKey: httpStatus, descKey: httpDesc },
    {
      id: "browser",
      icon: Monitor,
      tone: "neutral" as MetricTone,
      titleKey: "metricBrowser",
      statusText: browserLabel,
      descKey: "descBrowserFp",
    },
  ]
}

function formatLocalTime(timezone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezone.includes("/") ? timezone : undefined,
    }).format(new Date())
  } catch {
    return new Date().toLocaleTimeString()
  }
}

export function PrivacyDashboard({
  report,
  browser,
  fingerprint,
  webRTC,
  environment,
  services,
  onCopyIp,
  copied,
}: {
  report: ConnectionReport
  browser: BrowserDetails | null
  fingerprint: FingerprintData | null
  webRTC: WebRTCData | null
  environment: EnvironmentSignals | null
  services?: Record<string, ServiceStatus>
  onCopyIp: () => void
  copied: boolean
}) {
  const { tr, locale } = useLocale()

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
    return runPrivacyPlatformAnalysis({ report, browser, fingerprint, webRTC, environment: env, leaks, services })
  }, [report, browser, fingerprint, webRTC, env, services])

  const metrics = useMemo(() => buildMetrics(report, data.leak.verdict, tr), [report, data.leak.verdict, tr])

  const visVisible = data.visibility.filter(v => v.level === "visible").length
  const visPartial = data.visibility.filter(v => v.level === "partial").length
  const liveStreamChecks = data.streaming.filter(s => s.source === "live").length
  const streamingSubtitle = tr("streamingSubtitle")
    .replace("{live}", String(liveStreamChecks))
    .replace("{total}", String(data.streaming.length))
  const locationLine = [report.city, report.region, report.country].filter(Boolean).join(", ") || "—"
  const screenRes = browser?.screen || data.visibility.find(v => v.id === "screen")?.value || "—"
  const localTime = formatLocalTime(env.timezone, locale)
  const statusTone = data.leak.verdict === "critical" ? "text-rose-400" : data.overview.connectionStatusKey === "statusDirect" ? "text-emerald-400" : "text-amber-400"

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Hero — full width */}
      <Card accent padding={false} className="p-5 sm:p-6 lg:p-7">
        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-center">
          {/* Left — IP */}
          <div className="min-w-0 order-1 lg:order-none">
            <button
              type="button"
              onClick={onCopyIp}
              className="flex items-center gap-3 w-full rounded-xl border border-nc bg-nc-inset px-4 py-3.5 hover:bg-nc-inset-hover transition-colors group text-start"
            >
              <CountryFlag code={report.country_code} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-lg sm:text-xl text-nc-primary ltr-mono truncate tracking-tight">{report.ip}</p>
                <p className="text-sm text-nc-muted truncate mt-0.5">
                  {report.country}{data.overview.city !== "—" ? ` · ${data.overview.city}` : ""}
                </p>
              </div>
              <Copy className="size-4 text-nc-faint group-hover:text-nc-muted shrink-0" />
              {copied && <span className="text-xs text-emerald-500 shrink-0">{tr("copied")}</span>}
            </button>
          </div>

          {/* Center — Score */}
          <div className="flex flex-col items-center shrink-0 order-3 lg:order-none">
            <ScoreRing score={data.overview.privacyScore} size={120} />
            <p className="text-[11px] uppercase tracking-[0.14em] text-nc-muted mt-2.5">{tr("privacyScore")}</p>
          </div>

          {/* Right — Status + nested cards */}
          <div className="space-y-3 min-w-0 order-2 lg:order-none">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-nc-faint mb-1">{tr("connectionStatus")}</p>
              <p className={cn("text-base font-semibold", statusTone)}>{tr(data.overview.connectionStatusKey)}</p>
              <p className="text-xs text-nc-faint mt-1 leading-relaxed line-clamp-2">{tr(data.overview.summaryKey)}</p>
            </div>
            <div className="rounded-xl border border-nc-divider bg-nc-inset px-3.5 py-3 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-nc-faint mb-1">{tr("heroIspAsn")}</p>
              <p className="text-sm text-nc-secondary truncate">{report.isp || "—"}</p>
              <p className="text-xs text-nc-muted ltr-mono mt-0.5">{report.asn ? `AS${report.asn}` : "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-3 sm:gap-4 items-stretch">
        {report.connection_classification ? (
          <ConnectionClassificationPanel data={report.connection_classification} />
        ) : (
          <Card className="h-full" padding={false}>
            <div className="p-4 sm:p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-nc-faint">{tr("connectionType")}</p>
              <p className="text-lg font-semibold text-nc-primary mt-1">
                {tr(data.overview.connectionTypeKey)}
              </p>
            </div>
          </Card>
        )}
        <WebsitePerspectiveCard
          report={report}
          browser={browser}
          connectionTypeKey={(report.connection_classification?.label_key || data.overview.connectionTypeKey) as TranslationKey}
        />
      </div>

      {/* 8 metric cards — 4×2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {report.fraud_check_enabled && (report.fraud_providers?.some(p => p.active) ?? false) && (
        <FraudProvidersPanel providers={report.fraud_providers ?? []} />
      )}

      {report.tls_diagnostics && (
        <TLSDiagnosticsPanel diag={report.tls_diagnostics} />
      )}

      {/* Bottom info bar */}
      <Card padding={false} className="overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-nc-grid">
          <InfoBarItem label={tr("barTimezone")} value={env.timezone} />
          <InfoBarItem label={tr("barLocation")} value={locationLine} />
          <InfoBarItem label={tr("barLocalTime")} value={localTime} />
          <InfoBarItem label={tr("barLanguage")} value={env.locale || env.languages[0] || "—"} />
          <InfoBarItem label={tr("barScreen")} value={screenRes} />
        </div>
      </Card>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-nc-muted mb-3">{tr("sectionRecommendations")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recommendations.map(r => (
              <div key={r.id} className="rounded-xl border border-violet-500/10 bg-violet-500/[0.04] px-4 py-3 text-sm text-nc-muted leading-relaxed">
                {tr(r.textKey)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Deep-dive accordions */}
      <Accordion
        title={tr("sectionSignals")}
        subtitle={data.signalIssues.length === 0 ? tr("noMismatches") : `${data.signalIssues.length} mismatch${data.signalIssues.length > 1 ? "es" : ""}`}
      >
        <div className="pt-4 space-y-3">
          {data.signalIssues.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-4">
              <Check className="size-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm text-emerald-300">{tr("noMismatches")}</p>
                <p className="text-xs text-nc-faint mt-0.5">{tr("noMismatchesHint")}</p>
              </div>
            </div>
          ) : (
            data.signalIssues.map(issue => <SignalCard key={issue.id} issue={issue} />)
          )}
        </div>
      </Accordion>

      <Accordion
        title={tr("sectionVisibilityTitle")}
        subtitle={`${data.visibility.length} signals · ${visVisible} visible · ${visPartial} partial`}
      >
        <div className="grid lg:grid-cols-2 gap-6 pt-4">
          {VIS_GROUPS.map(g => {
            const items = data.visibility.filter(v => g.ids.includes(v.id))
            return <VisibilityGroup key={g.titleKey} title={g.titleKey} items={items} />
          })}
        </div>
      </Accordion>

      <Accordion title={tr("sectionStreaming")} subtitle={streamingSubtitle}>
        <p className="text-xs text-nc-muted leading-relaxed pt-3">{tr("streamingExplain")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-4">
          {data.streaming.map(s => (
            <div key={s.id} className="rounded-xl border border-nc-divider bg-nc-inset px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-nc-secondary truncate">{s.name}</span>
                <CompatPill level={s.level} />
              </div>
              <p className="text-[11px] text-nc-muted leading-relaxed">{tr(s.reasonKey)}</p>
              <p className="text-[10px] text-nc-faint">
                {s.source === "live" ? tr("streamSourceLive") : tr("streamSourceEstimate")}
              </p>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion title={tr("sectionAdvanced")} subtitle="TLS · ICE · Raw fingerprint · Geo">
        <div className="grid sm:grid-cols-2 gap-6 pt-4">
          {data.advanced.map(block => (
            <div key={block.titleKey}>
              <p className="text-[11px] uppercase tracking-wider text-nc-faint mb-2">{tr(block.titleKey)}</p>
              <div className="font-mono text-[11px] text-nc-muted space-y-1 ltr-mono rounded-xl bg-nc-inset border border-nc-divider p-3 max-h-36 overflow-y-auto">
                {block.rows.map((row, i) => (
                  <div key={i} className="flex justify-between gap-2 py-0.5">
                    <span className="text-nc-faint shrink-0">{row.label}</span>
                    <span className="text-nc-muted truncate text-end">{row.value}</span>
                  </div>
                ))}
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
      className="flex items-center gap-1.5 text-sm text-nc-muted hover:text-nc-secondary px-3 py-1.5 rounded-full border border-nc-divider hover:border-nc hover:bg-nc-hover transition-all"
      aria-label="Toggle language"
    >
      <Languages className="size-3.5" />
      <span className="font-medium text-xs">{tr("langToggle")}</span>
    </button>
  )
}
