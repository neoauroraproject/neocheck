"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Database, Download, HardDrive, Plus, RotateCcw, Trash2 } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-shell"

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

  if (loading) return <AdminLoading />

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        title="Database Backups"
        description="SQLite snapshots — restore, download, or delete"
        actions={
          <AdminButton variant="primary" onClick={handleCreateBackup} disabled={creating}>
            <Plus className="size-4" />
            {creating ? "Creating…" : "Create backup"}
          </AdminButton>
        }
      />

      <AdminCard>
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Available snapshots</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/[0.06]">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {backups.map(b => (
                <tr key={b.name} className="hover:bg-white/[0.02]">
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
                    <div className="flex justify-end gap-2 flex-wrap">
                      <AdminButton onClick={() => handleRestore(b.name)} disabled={restoring !== null} className="!px-2.5 !py-1.5 !text-xs">
                        <RotateCcw className={`size-3.5 ${restoring === b.name ? "animate-spin" : ""}`} />
                        Restore
                      </AdminButton>
                      <AdminButton href={`/api/admin/backups/download?filename=${encodeURIComponent(b.name)}`} className="!px-2.5 !py-1.5 !text-xs">
                        <Download className="size-3.5" />
                        Download
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => handleDelete(b.name)} className="!px-2.5 !py-1.5 !text-xs">
                        <Trash2 className="size-3.5" />
                        Delete
                      </AdminButton>
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
      </AdminCard>
    </div>
  )
}
