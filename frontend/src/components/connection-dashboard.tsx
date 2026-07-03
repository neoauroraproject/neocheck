"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Copy, Globe } from "lucide-react"
import {
  getConnectionType,
  getDnsLabel,
  getPrivacyScore,
  getReputationLabel,
  getServiceLabel,
  getVerdict,
  getVpnLabel,
  getWebRtcLabel,
} from "@/lib/insights"
import { cn } from "@/lib/utils"
import type {
  BrowserDetails,
  ConnectionReport,
  FingerprintData,
  ServiceStatus,
  WebRTCData,
} from "@/types/report"

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        ok ? "text-zinc-300" : "text-zinc-400",
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", ok ? "bg-emerald-500" : "bg-amber-500")} />
      {label}
    </span>
  )
}

function DetailCard({ question, answer, sub }: { question: string; answer: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 min-w-0">
      <p className="text-[11px] text-zinc-500 mb-1">{question}</p>
      <p className="text-sm font-medium text-zinc-100 truncate">{answer}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function AdvancedSection({
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
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{title}</span>
        <ChevronDown className={cn("size-4 text-zinc-600 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-300 text-right font-mono text-xs truncate">{value}</span>
    </div>
  )
}

export function ConnectionDashboard({
  report,
  browser,
  fingerprint,
  webRTC,
  webrtcStatus,
  services,
  onCopyIp,
  copied,
}: {
  report: ConnectionReport
  browser: BrowserDetails | null
  fingerprint: FingerprintData | null
  webRTC: WebRTCData | null
  webrtcStatus: WebRTCData["status"]
  services: Record<string, ServiceStatus>
  onCopyIp: () => void
  copied: boolean
}) {
  const privacyScore = getPrivacyScore(report, browser, fingerprint, webRTC, webrtcStatus, services)
  const verdict = getVerdict(report, privacyScore)
  const vpn = getVpnLabel(report)
  const webrtc = getWebRtcLabel(webrtcStatus)
  const dns = getDnsLabel(report.dns_leak)
  const reputation = getReputationLabel(report.risk_score ?? 0)
  const connectionType = getConnectionType(report)

  const browserName = report.browser || browser?.name || "Unknown"
  const osName = report.operating_system || browser?.os || "Unknown"
  const ipVersion = [report.ipv4 && "IPv4", report.ipv6 && "IPv6"].filter(Boolean).join(" · ") || "Unknown"

  return (
    <div className="space-y-16">
      {/* ─── Layer 1: Hero (above the fold) ─── */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">{verdict.title}</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-semibold tracking-tight text-zinc-50 tabular-nums">
                {privacyScore}
              </span>
              <span className="text-lg text-zinc-500">Privacy Score</span>
            </div>
            <p className="text-base text-zinc-400 max-w-md leading-relaxed">{verdict.detail}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onCopyIp}
            className="group flex items-center gap-2 text-left"
          >
            <span className="text-2xl font-mono font-medium text-zinc-100 tracking-tight">{report.ip}</span>
            <Copy className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            {copied && <span className="text-xs text-emerald-500">Copied</span>}
          </button>

          <div className="flex items-center gap-3 min-w-0">
            {report.country_code ? (
              <img
                src={`https://flagcdn.com/w40/${report.country_code.toLowerCase()}.png`}
                alt=""
                className="h-5 w-7 object-cover rounded-sm opacity-90"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
              />
            ) : (
              <Globe className="size-5 text-zinc-500 shrink-0" />
            )}
            <span className="text-lg text-zinc-200 truncate">{report.country || "Unknown"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <StatusPill label={`${connectionType} connection`} ok={connectionType === "Residential" || connectionType === "VPN" || connectionType === "Tor"} />
          <StatusPill label={vpn.label} ok={vpn.ok} />
          <StatusPill label={`WebRTC · ${webrtc.label}`} ok={webrtc.ok} />
          <StatusPill label={`DNS · ${dns.label}`} ok={dns.ok} />
        </div>
      </section>

      {/* ─── Layer 2: Essential details ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-600">Essentials</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DetailCard question="Who provides your internet?" answer={report.isp || "Unknown"} />
          <DetailCard question="Network identifier" answer={report.asn ? `AS${report.asn}` : "Unknown"} sub={report.asn_type} />
          <DetailCard question="What browser am I using?" answer={browserName} sub={report.browser_version || browser?.version} />
          <DetailCard question="What device OS?" answer={osName} />
          <DetailCard question="IP protocols" answer={ipVersion} />
          <DetailCard question="Is my IP trusted?" answer={reputation.label} sub={`Risk score ${report.risk_score ?? 0}%`} />
          <DetailCard question="Can I use AI tools?" answer={getServiceLabel(services.ChatGPT)} sub="ChatGPT" />
          <DetailCard
            question="Can I stream content?"
            answer={[getServiceLabel(services.Netflix), getServiceLabel(services.Spotify)].join(" · ")}
            sub="Netflix · Spotify"
          />
        </div>
      </section>

      {/* ─── Layer 3: Advanced diagnostics ─── */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-600">Advanced</h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-5">
          <AdvancedSection title="Network routing">
            <DetailRow label="Reverse DNS" value={report.reverse_dns || report.hostname} />
            <DetailRow label="Hostname" value={report.hostname} />
            <DetailRow label="Organization" value={report.organization} />
            <DetailRow label="Connection type" value={report.connection_type} />
            <DetailRow label="Carrier class" value={report.carrier_class} />
          </AdvancedSection>

          <AdvancedSection title="TLS & encryption">
            <DetailRow label="HTTPS" value={report.https ? "Active" : "Inactive"} />
            <DetailRow label="TLS version" value={report.tls_version} />
            <DetailRow label="Cipher suite" value={report.cipher_suite} />
            <DetailRow label="HTTP version" value={report.http_version} />
            <DetailRow label="HSTS" value={report.hsts ? "Enabled" : "Disabled"} />
            <DetailRow label="Certificate issuer" value={report.cert_issuer} />
          </AdvancedSection>

          <AdvancedSection title="WebRTC details">
            <DetailRow label="Status" value={webrtcStatus} />
            <DetailRow label="Public IPs" value={webRTC?.publicIPs.join(", ")} />
            <DetailRow label="Local IPv4" value={webRTC?.localIPv4.join(", ")} />
            <DetailRow label="Local IPv6" value={webRTC?.localIPv6.join(", ")} />
          </AdvancedSection>

          <AdvancedSection title="Browser fingerprint">
            <DetailRow label="Canvas hash" value={fingerprint?.canvas} />
            <DetailRow label="WebGL vendor" value={fingerprint?.webglVendor} />
            <DetailRow label="WebGL renderer" value={fingerprint?.webglRenderer} />
            <DetailRow label="Audio hash" value={fingerprint?.audio} />
            <DetailRow label="Screen" value={browser?.screen} />
            <DetailRow label="Language" value={browser?.language || report.language} />
          </AdvancedSection>

          <AdvancedSection title="Navigator & headers">
            <DetailRow label="User-Agent" value={report.user_agent} />
            <DetailRow label="Platform" value={browser?.platform || report.platform} />
            <DetailRow label="ALPN" value={report.alpn} />
            <DetailRow label="City" value={[report.city, report.region].filter(Boolean).join(", ")} />
            <DetailRow label="Timezone" value={report.timezone} />
          </AdvancedSection>
        </div>
      </section>
    </div>
  )
}
