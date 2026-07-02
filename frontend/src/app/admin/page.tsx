"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Play, RotateCw, Server, Activity, Database, KeyRound, Cpu, HardDrive } from "lucide-react"

interface SystemStatus {
	version: string
	uptime: string
	memory_allocated_mb: string
	cpu_cores: number
	docker_status: string
	active_requests: number
	enabled_providers: string[]
	configuration_status: string
	ssl_status: string
	database_status: string
}

export default function AdminDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const router = useRouter()

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/status")
      if (res.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!res.ok) throw new Error("Failed to load status")
      const data = await res.json()
      setStatus(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (action: string, endpoint: string) => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/admin/${endpoint}`, { method: "POST" })
      if (!res.ok) throw new Error(`Action ${action} failed`)
      alert(`${action} triggered successfully!`)
      fetchStatus()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading("")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl text-red-400">
        <h2 className="text-lg font-bold">Error loading dashboard</h2>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={fetchStatus} className="mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-zinc-100 rounded-lg text-sm transition-colors">
          Retry Connection
        </button>
      </div>
    )
  }

  const statCards = [
    { name: "Active Requests", value: status?.active_requests ?? 0, icon: Activity, desc: "Concurrent requests currently being processed" },
    { name: "Memory Footprint", value: status?.memory_allocated_mb ?? "0 MB", icon: HardDrive, desc: "Current heap allocation of the process" },
    { name: "CPU Core Allocation", value: `${status?.cpu_cores ?? 0} Cores`, icon: Cpu, desc: "Logical CPU count available to process" },
    { name: "Server Uptime", value: status?.uptime ? status.uptime.split(".")[0] + "s" : "N/A", icon: Server, desc: "Time elapsed since system startup" },
  ]

  const healthChecks = [
    { name: "Database status", value: status?.database_status, success: status?.database_status === "Connected" },
    { name: "SSL encryption", value: status?.ssl_status, success: status?.ssl_status === "Enabled" },
    { name: "Docker environment", value: status?.docker_status, success: status?.docker_status === "Running" },
    { name: "Configuration file", value: status?.configuration_status, success: status?.configuration_status === "Valid" },
  ]

  return (
    <div className="space-y-10">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">System Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Real-time status overview of NeoCheck core engine (v{status?.version})</p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => handleAction("Reload Config", "reload")}
            disabled={actionLoading !== ""}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm transition-all"
          >
            <RotateCw className={`w-4 h-4 ${actionLoading === "Reload Config" ? "animate-spin" : ""}`} />
            Reload Config
          </button>
          <button
            onClick={() => handleAction("Restart Engine", "restart")}
            disabled={actionLoading !== ""}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-zinc-100 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/10"
          >
            <Play className="w-4 h-4 fill-current" />
            Restart Engine
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">{card.name}</span>
                <Icon className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <span className="text-3xl font-extrabold tracking-tight">{card.value}</span>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Environment Status Checks */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold">System Health Checks</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Automated validation flags checks</p>
          </div>
          <div className="divide-y divide-zinc-800">
            {healthChecks.map((check) => (
              <div key={check.name} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                <span className="text-sm font-semibold">{check.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${check.success ? "bg-emerald-500 shadow-lg shadow-emerald-900/50" : "bg-zinc-600"}`}></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{check.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enabled Detection Providers */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold">Engine Plugins</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Active detection pipelines</p>
            
            <div className="mt-6 space-y-3">
              {status?.enabled_providers.map((provider) => (
                <div key={provider} className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <KeyRound className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold capitalize text-zinc-200">{provider}</span>
                </div>
              ))}
              {(!status?.enabled_providers || status.enabled_providers.length === 0) && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No providers active. All connections will fall back to local mocks.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
