"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminAmbient, AdminButton, AdminCard, AdminInput } from "@/components/admin/admin-shell"

export default function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")
      router.push("/admin")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AdminAmbient />
      <div className="min-h-screen flex items-center justify-center p-4 text-zinc-100">
        <AdminCard className="w-full max-w-md" padding="lg">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">NeoCheck</p>
            <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in to manage your instance</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <AdminInput label="Username" type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
            <AdminInput label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
            <AdminButton type="submit" variant="primary" disabled={loading} className="w-full">
              {loading ? "Authenticating…" : "Sign in"}
            </AdminButton>
          </form>
        </AdminCard>
      </div>
    </>
  )
}
