"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, ShieldAlert, CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface ProviderConfig {
  enabled: boolean
  api_key: string
}

interface ConfigData {
  providers: {
    abuseipdb: ProviderConfig
    bigdatacloud: ProviderConfig
    ipqualityscore: ProviderConfig
    scamalytics: ProviderConfig
  }
}

export default function AdminProviders() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; msg: string }>>({})
  const router = useRouter()

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!res.ok) throw new Error("Failed to load providers config")
      const data = await res.json()
      setConfig(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const handleToggle = async (provider: string, enabled: boolean) => {
    if (!config) return
    const updated = {
      ...config,
      providers: {
        ...config.providers,
        [provider]: {
          ...config.providers[provider as keyof typeof config.providers],
          enabled,
        },
      },
    }

    setConfig(updated)

    // Save toggle immediately
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error("Failed to save provider config")
    } catch (err: any) {
      alert(err.message)
      fetchProviders()
    }
  }

  const handleKeyChange = (provider: string, key: string) => {
    if (!config) return
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [provider]: {
          ...config.providers[provider as keyof typeof config.providers],
          api_key: key,
        },
      },
    })
  }

  const saveKey = async (provider: string) => {
    if (!config) return
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error("Failed to save provider API key")
      alert("API Key saved successfully!")
    } catch (err: any) {
      alert(err.message)
    }
  }

  const testProvider = async (provider: string) => {
    if (!config) return
    const key = config.providers[provider as keyof typeof config.providers].api_key
    if (!key || key === "---") {
      alert("Please enter a valid API key to test the connection.")
      return
    }

    setTesting(provider)
    setTestResult({ ...testResult, [provider]: { success: false, msg: "" } })

    try {
      const res = await fetch("/api/admin/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: key }),
      })

      const data = await res.json()
      if (data.success) {
        setTestResult((prev) => ({
          ...prev,
          [provider]: { success: true, msg: "Connection successful" },
        }))
      } else {
        setTestResult((prev) => ({
          ...prev,
          [provider]: { success: false, msg: data.error || "Connection failed" },
        }))
      }
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: { success: false, msg: err.message || "Network error" },
      }))
    } finally {
      setTesting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  const providerList = [
    { id: "abuseipdb", name: "AbuseIPDB", desc: "Check reported abusive IP addresses and fraud activities" },
    { id: "bigdatacloud", name: "BigDataCloud", desc: "Detailed geographic lookup and network carrier mapping" },
    { id: "ipqualityscore", name: "IPQualityScore", desc: "Advanced proxy, VPN, and device fingerprint intelligence" },
    { id: "scamalytics", name: "Scamalytics", desc: "Automated IP fraud score analyzer and risk profiling" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">IP Detection Providers</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage external API integrations, validate API credentials, and query limits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providerList.map((p) => {
          const provConfig = config?.providers[p.id as keyof typeof config.providers]
          const test = testResult[p.id]

          return (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {p.name}
                    </h2>
                    <p className="text-zinc-400 text-xs leading-relaxed">{p.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={provConfig?.enabled || false}
                    onChange={(e) => handleToggle(p.id, e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-500 shrink-0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">API Authentication Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="password"
                        value={provConfig?.api_key || ""}
                        onChange={(e) => handleKeyChange(p.id, e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500"
                        placeholder={provConfig?.api_key ? "••••••••••••••••" : "Enter API Key"}
                      />
                      <KeyRound className="w-4 h-4 text-zinc-600 absolute right-3 top-3.5" />
                    </div>
                    <button
                      onClick={() => saveKey(p.id)}
                      className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-850 transition-colors"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-zinc-850">
                <button
                  onClick={() => testProvider(p.id)}
                  disabled={testing === p.id}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-zinc-100 text-sm font-semibold rounded-xl transition-all"
                >
                  {testing === p.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </button>

                {test && test.msg && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {test.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-400 font-semibold">{test.msg}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-400 font-semibold">{test.msg}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
