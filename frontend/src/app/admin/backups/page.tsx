"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Database, Plus, Download, RotateCcw, Trash2, Calendar, HardDrive } from "lucide-react"

interface BackupInfo {
  name: string
  size: number
  time: string
}

export default function AdminBackups() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const router = useRouter()

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/admin/backups")
      if (res.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!res.ok) throw new Error("Failed to load backups")
      const data = await res.json()
      setBackups(data.backups || [])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" })
      if (!res.ok) throw new Error("Failed to create backup")
      const data = await res.json()
      alert(data.message)
      fetchBackups()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore the backup "${filename}"? This will overwrite your current active database completely!`)) return
    setRestoring(filename)
    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      })
      if (!res.ok) throw new Error("Failed to restore backup")
      const data = await res.json()
      alert(data.message)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRestoring(null)
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete the backup "${filename}"?`)) return
    try {
      const res = await fetch(`/api/admin/backups?filename=${encodeURIComponent(filename)}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete backup")
      alert("Backup snapshot deleted.")
      fetchBackups()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Database Backups</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage SQLite database snapshots, restore historic data, and configure schedules</p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-zinc-100 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/10 active:scale-[0.98] w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          {creating ? "Creating backup..." : "Create Backup"}
        </button>
      </div>

      {/* Backup Lists */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Available Database Snapshots</h2>
          <p className="text-zinc-400 text-xs mt-0.5">Stored inside `/opt/neocheck/backups` volume</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 border border-zinc-850 text-xs uppercase text-zinc-400 font-semibold">
              <tr>
                <th className="px-6 py-4 rounded-l-xl">File Name</th>
                <th className="px-6 py-4">File Size</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {backups.map((b) => (
                <tr key={b.name} className="hover:bg-zinc-850/30">
                  <td className="px-6 py-4 font-semibold text-zinc-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-400" />
                    {b.name}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                      {formatSize(b.size)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {new Date(b.time).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleRestore(b.name)}
                        disabled={restoring !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${restoring === b.name ? "animate-spin" : ""}`} />
                        Restore
                      </button>
                      <a
                        href={`/api/admin/backups/download?filename=${encodeURIComponent(b.name)}`}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(b.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-900/25 border border-red-900/50 text-red-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-zinc-500">
                    No database backups found. Click "Create Backup" above to take a snapshot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
