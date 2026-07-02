"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Terminal, Trash2, Download, Search, RefreshCw } from "lucide-react"

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">System Logs</h1>
          <p className="text-zinc-400 text-sm mt-1">Monitor Go backend events, API requests, and provider checks</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/20 hover:bg-red-900/25 border border-red-900/50 text-red-400 font-semibold rounded-xl text-sm transition-all flex-1 md:flex-none"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logfile
          </button>
          <a
            href="/api/admin/logs/download"
            download
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm transition-all flex-1 md:flex-none"
          >
            <Download className="w-4 h-4" />
            Download Log
          </a>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Force Refresh
          </button>
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
            className="w-full h-[55vh] bg-zinc-950 border border-zinc-850 rounded-xl p-6 pt-10 overflow-y-auto font-mono text-xs leading-relaxed text-zinc-300 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-900"
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
      </div>
    </div>
  )
}
