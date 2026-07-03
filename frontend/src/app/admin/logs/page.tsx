"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Download, RefreshCw, Search, Trash2 } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
} from "@/components/admin/admin-shell"

export default function AdminLogs() {
  const [logs, setLogs] = useState<string[]>([])
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const logTerminalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchLogs = async () => {
    try {
      const query = filter ? `?filter=${encodeURIComponent(filter)}` : ""
      const res = await fetch(`/api/admin/logs${query}`)
      if (res.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!res.ok) throw new Error("Failed to load logs")
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filter])

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight
    }
  }, [logs])

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear the logs? This operation is permanent.")) return
    setClearing(true)
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to clear logs")
      setLogs([])
      alert("Logs cleared successfully!")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        title="System Logs"
        description="Backend events, API requests, and provider checks"
        actions={
          <>
            <AdminButton variant="danger" onClick={handleClear} disabled={clearing}>
              <Trash2 className="size-4" />
              Clear
            </AdminButton>
            <AdminButton href="/api/admin/logs/download">
              <Download className="size-4" />
              Download
            </AdminButton>
          </>
        }
      />

      <AdminCard>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <AdminInput value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter logs…" className="ps-9" />
            <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-3 pointer-events-none" />
          </div>

          <AdminButton variant="ghost" onClick={fetchLogs}>
            <RefreshCw className="size-3.5" />
            Refresh
          </AdminButton>
        </div>

        {/* Console Box */}
        <div className="relative">
          <div className="absolute top-3 left-4 flex gap-1.5 z-10">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
          </div>

          <div
            ref={logTerminalRef}
            className="w-full h-[55vh] bg-black/40 border border-white/[0.06] rounded-xl p-6 pt-10 overflow-y-auto font-mono text-xs leading-relaxed text-zinc-300 space-y-1.5"
          >
            {loading ? (
              <div className="text-zinc-500 italic">Streaming events...</div>
            ) : logs.length === 0 ? (
              <div className="text-zinc-650 italic">No matching logs found.</div>
            ) : (
              logs.map((log, index) => {
                let colorClass = "text-zinc-400"
                if (log.toLowerCase().includes("error") || log.toLowerCase().includes("fatal")) {
                  colorClass = "text-red-400"
                } else if (log.toLowerCase().includes("warn")) {
                  colorClass = "text-yellow-400"
                } else if (log.toLowerCase().includes("info")) {
                  colorClass = "text-emerald-400/80"
                }
                return (
                  <div key={index} className={`whitespace-pre-wrap ${colorClass}`}>
                    {log}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </AdminCard>
    </div>
  )
}
