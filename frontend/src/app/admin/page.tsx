"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Cpu, HardDrive, KeyRound, Play, RotateCw, Server } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminLoading,
  AdminPageHeader,
  AdminStatCard,
} from "@/components/admin/admin-shell"

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
      setStatus(await res.json())
      setError("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load status")
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
      fetchStatus()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActionLoading("")
    }
  }

  if (loading) return <AdminLoading />

  if (error) {
    return (
      <AdminCard className="border-rose-500/20">
        <p className="text-sm font-medium text-rose-300">Error loading dashboard</p>
        <p className="text-xs text-zinc-500 mt-1">{error}</p>
        <AdminButton onClick={fetchStatus} className="mt-4">
          Retry
        </AdminButton>
      </AdminCard>
    )
  }

  const healthChecks = [
    { name: "Database", value: status?.database_status, ok: status?.database_status === "Connected" },
    { name: "SSL", value: status?.ssl_status, ok: status?.ssl_status === "Enabled" },
    { name: "Docker", value: status?.docker_status, ok: status?.docker_status === "Running" },
    { name: "Configuration", value: status?.configuration_status, ok: status?.configuration_status === "Valid" },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        title="System Dashboard"
        description={`NeoCheck engine v${status?.version} — real-time health and controls`}
        actions={
          <>
            <AdminButton
              onClick={() => handleAction("Reload Config", "reload")}
              disabled={actionLoading !== ""}
            >
              <RotateCw className={`size-4 ${actionLoading === "Reload Config" ? "animate-spin" : ""}`} />
              Reload
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => handleAction("Restart Engine", "restart")}
              disabled={actionLoading !== ""}
            >
              <Play className="size-4" />
              Restart
            </AdminButton>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Active requests" value={status?.active_requests ?? 0} icon={Activity} hint="Concurrent API requests" />
        <AdminStatCard label="Memory" value={status?.memory_allocated_mb ?? "0 MB"} icon={HardDrive} hint="Process heap allocation" />
        <AdminStatCard label="CPU cores" value={status?.cpu_cores ?? 0} icon={Cpu} hint="Available logical cores" />
        <AdminStatCard
          label="Uptime"
          value={status?.uptime ? `${status.uptime.split(".")[0]}s` : "N/A"}
          icon={Server}
          hint="Since last startup"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
        <AdminCard className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Health checks</p>
          <div className="divide-y divide-white/[0.05]">
            {healthChecks.map(check => (
              <div key={check.name} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-zinc-300">{check.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${check.ok ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  <span className="text-xs text-zinc-400">{check.value}</span>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Active plugins</p>
          <div className="space-y-2">
            {status?.enabled_providers?.map(provider => (
              <div key={provider} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/20 border border-white/[0.05]">
                <KeyRound className="size-4 text-violet-400 shrink-0" />
                <span className="text-sm text-zinc-300 capitalize">{provider}</span>
              </div>
            ))}
            {(!status?.enabled_providers || status.enabled_providers.length === 0) && (
              <p className="text-xs text-zinc-600 py-4 text-center">No providers enabled</p>
            )}
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
