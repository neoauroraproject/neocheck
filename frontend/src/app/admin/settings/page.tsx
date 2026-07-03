"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, ShieldAlert, Cpu, Eye, EyeOff } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-shell"

interface ConfigData {
  server: {
    host: string
    port: number
  }
  branding: {
    name: string
    subtitle: string
    logo: string
    favicon: string
    primary_color: string
    accent_color: string
    footer_text: string
    copyright_text: string
    support_url: string
    github_url: string
    documentation_url: string
    public_url: string
  }
  ssl: {
    enabled: boolean
    cert_path: string
    key_path: string
  }
  features: {
    ipv6: boolean
    webrtc: boolean
    dns_leak: boolean
    service_check: boolean
    fraud_check: boolean
  }
  admin: {
    username: string
    password_hash: string
  }
}

export default function AdminSettings() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!res.ok) throw new Error("Failed to load settings")
      const data = await res.json()
      setConfig(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSaving(true)
    try {
      const payload = { ...config }
      if (newPassword) {
        payload.admin.password_hash = newPassword // Backend will bcrypt hash it if it's not "---"
      } else {
        payload.admin.password_hash = "---" // Keep existing hash
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Save settings failed")
      }

      alert("Settings updated successfully!")
      setNewPassword("")
      fetchSettings()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading />

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        title="System Settings"
        description="Branding, server routing, security, and engine features"
      />

      <form onSubmit={handleSave} className="space-y-5 max-w-3xl">
        <AdminCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Branding</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="Brand name"
              type="text"
              required
              value={config?.branding.name || ""}
              onChange={e => setConfig({ ...config!, branding: { ...config!.branding, name: e.target.value } })}
            />
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500">Subtitle</label>
              <input
                type="text"
                required
                value={config?.branding.subtitle || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, subtitle: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Logo URL / Base64</label>
              <input
                type="text"
                value={config?.branding.logo || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, logo: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Public URL (e.g. http://example.com)</label>
              <input
                type="text"
                value={config?.branding.public_url || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, public_url: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Favicon URL / Base64</label>
              <input
                type="text"
                value={config?.branding.favicon || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, favicon: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Primary Color (Hex)</label>
              <input
                type="text"
                value={config?.branding.primary_color || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, primary_color: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Accent Color (Hex)</label>
              <input
                type="text"
                value={config?.branding.accent_color || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, accent_color: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Footer Text</label>
              <input
                type="text"
                value={config?.branding.footer_text || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, footer_text: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Copyright Text</label>
              <input
                type="text"
                value={config?.branding.copyright_text || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, copyright_text: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Support URL</label>
              <input
                type="text"
                value={config?.branding.support_url || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, support_url: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">GitHub Repo URL</label>
              <input
                type="text"
                value={config?.branding.github_url || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, github_url: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Documentation URL</label>
              <input
                type="text"
                value={config?.branding.documentation_url || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, documentation_url: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Server & SSL</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Host Binding</label>
              <input
                type="text"
                required
                value={config?.server.host || ""}
                onChange={(e) => setConfig({ ...config!, server: { ...config!.server, host: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Port</label>
              <input
                type="number"
                required
                value={config?.server.port || ""}
                onChange={(e) => setConfig({ ...config!, server: { ...config!.server, port: parseInt(e.target.value) } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sslEnabled"
                checked={config?.ssl.enabled || false}
                onChange={(e) => setConfig({ ...config!, ssl: { ...config!.ssl, enabled: e.target.checked } })}
                className="w-4 h-4 rounded accent-violet-500"
              />
              <label htmlFor="sslEnabled" className="text-sm font-semibold select-none">Enable SSL Reverse Proxy Validation</label>
            </div>

            {config?.ssl.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Certificate Path</label>
                  <input
                    type="text"
                    required
                    value={config?.ssl.cert_path || ""}
                    onChange={(e) => setConfig({ ...config!, ssl: { ...config!.ssl, cert_path: e.target.value } })}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Private Key Path</label>
                  <input
                    type="text"
                    required
                    value={config?.ssl.key_path || ""}
                    onChange={(e) => setConfig({ ...config!, ssl: { ...config!.ssl, key_path: e.target.value } })}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
                  />
                </div>
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Engine features</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "IPv6 Resolution", key: "ipv6" },
              { label: "WebRTC Leak Testing", key: "webrtc" },
              { label: "DNS Leak Resolution", key: "dns_leak" },
              { label: "Active Service Availability", key: "service_check" },
              { label: "Fraud & Risk Analysis", key: "fraud_check" },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.06] rounded-xl">
                <input
                  type="checkbox"
                  id={f.key}
                  checked={(config?.features as any)?.[f.key] || false}
                  onChange={(e) => setConfig({
                    ...config!,
                    features: { ...config!.features, [f.key]: e.target.checked }
                  })}
                  className="w-4 h-4 rounded accent-violet-500"
                />
                <label htmlFor={f.key} className="text-sm font-semibold select-none text-zinc-300">{f.label}</label>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Admin credentials</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                value={config?.admin.username || ""}
                onChange={(e) => setConfig({ ...config!, admin: { ...config!.admin, username: e.target.value } })}
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/[0.15]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">New Password (Leave blank to keep current)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
                  placeholder="New Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </AdminCard>

        <div className="flex justify-end">
          <AdminButton type="submit" variant="primary" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save settings"}
          </AdminButton>
        </div>
      </form>
    </div>
  )
}
