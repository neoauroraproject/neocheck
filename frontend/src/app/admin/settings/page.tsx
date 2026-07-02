"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, ShieldAlert, Cpu, Eye, EyeOff } from "lucide-react"

interface ConfigData {
  server: {
    host: string
    port: number
  }
  branding: {
    name: string
    subtitle: string
    logo: string
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Configure branding, backend routing, security credentials, and active engine features</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {/* Branding Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Branding Settings</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Customize client UI appearance</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Brand Name</label>
              <input
                type="text"
                required
                value={config?.branding.name || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, name: e.target.value } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Subtitle</label>
              <input
                type="text"
                required
                value={config?.branding.subtitle || ""}
                onChange={(e) => setConfig({ ...config!, branding: { ...config!.branding, subtitle: e.target.value } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Server & SSL Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Server & SSL</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Configure host, port, and security keys</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Host Binding</label>
              <input
                type="text"
                required
                value={config?.server.host || ""}
                onChange={(e) => setConfig({ ...config!, server: { ...config!.server, host: e.target.value } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Port</label>
              <input
                type="number"
                required
                value={config?.server.port || ""}
                onChange={(e) => setConfig({ ...config!, server: { ...config!.server, port: parseInt(e.target.value) } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-4">
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Private Key Path</label>
                  <input
                    type="text"
                    required
                    value={config?.ssl.key_path || ""}
                    onChange={(e) => setConfig({ ...config!, ssl: { ...config!.ssl, key_path: e.target.value } })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Engine Features Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Engine Features</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Toggle active pipeline detectors on public checks</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "IPv6 Resolution", key: "ipv6" },
              { label: "WebRTC Leak Testing", key: "webrtc" },
              { label: "DNS Leak Resolution", key: "dns_leak" },
              { label: "Active Service Availability", key: "service_check" },
              { label: "Fraud & Risk Analysis", key: "fraud_check" },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
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
        </div>

        {/* Admin Credentials */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Admin Credentials</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Change master admin sign-in user and password</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                value={config?.admin.username || ""}
                onChange={(e) => setConfig({ ...config!, admin: { ...config!.admin, username: e.target.value } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-violet-500"
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
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-zinc-100 font-semibold rounded-xl shadow-lg shadow-violet-900/10 active:scale-[0.98] transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving settings..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  )
}
