"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowUpRight,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
} from "lucide-react"

export function AdminAmbient() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#050506]" />
      <div className="absolute -top-32 start-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  )
}

export function AdminCard({
  children,
  className,
  padding = "default",
}: {
  children: React.ReactNode
  className?: string
  padding?: "none" | "default" | "lg"
}) {
  const pad = padding === "none" ? "" : padding === "lg" ? "p-6 sm:p-8" : "p-5 sm:p-6"
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm", pad, className)}>
      {children}
    </div>
  )
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {description && <p className="text-sm text-zinc-500 mt-1 leading-relaxed max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function AdminButton({
  children,
  onClick,
  disabled,
  variant = "default",
  className,
  type = "button",
  href,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "default" | "primary" | "danger" | "ghost"
  className?: string
  type?: "button" | "submit"
  href?: string
}) {
  const styles = {
    default: "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]",
    primary: "border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25",
    danger: "border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    ghost: "border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]",
  }
  const cls = cn(
    "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-40",
    styles[variant],
    className,
  )
  if (href) {
    return (
      <a href={href} className={cls} download={href.includes("download")}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <AdminCard>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
        {Icon && <Icon className="size-4 text-zinc-600 shrink-0" />}
      </div>
      <p className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-zinc-100">{value}</p>
      {hint && <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{hint}</p>}
    </AdminCard>
  )
}

export function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
        <div className="absolute inset-0 rounded-full border-t border-zinc-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  )
}

export function AdminInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</label>}
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15] transition-colors",
          props.className,
        )}
      />
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    { name: "Providers", href: "/admin/providers", icon: ShieldAlert },
    { name: "Logs", href: "/admin/logs", icon: FileText },
    { name: "Backups", href: "/admin/backups", icon: Database },
  ]

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      router.push("/admin/login")
    } catch {
      router.push("/admin/login")
    }
  }

  return (
    <>
      <AdminAmbient />
      <div className="min-h-screen text-zinc-100 flex flex-col lg:flex-row">
        <aside className="lg:w-56 xl:w-60 border-b lg:border-b-0 lg:border-e border-white/[0.06] bg-[#050506]/80 backdrop-blur-xl shrink-0">
          <div className="px-4 lg:px-5 h-14 flex items-center justify-between lg:justify-start gap-2 border-b border-white/[0.06]">
            <span className="text-sm font-semibold tracking-tight">NeoCheck</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-full border border-white/[0.08]">
              Admin
            </span>
            <Link
              href="/"
              className="lg:ms-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 ms-auto"
            >
              Site <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {menuItems.map(item => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-white/[0.06] text-zinc-100 border border-white/[0.08]"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="hidden lg:block p-3 border-t border-white/[0.06] mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-400/90 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </>
  )
}
