"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

export type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const saved = localStorage.getItem("neocheck-theme")
  if (saved === "light" || saved === "dark") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    setThemeState(readStoredTheme())
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("neocheck-theme", t)
    document.documentElement.setAttribute("data-theme", t)
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light")

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { tr } = useLocale()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-1.5 text-sm text-nc-muted hover:text-nc-secondary px-3 py-1.5 rounded-full border border-nc-divider hover:border-nc hover:bg-nc-hover transition-all"
      aria-label={tr("themeToggle")}
    >
      {theme === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      <span className="font-medium text-xs hidden sm:inline">{theme === "light" ? tr("themeDark") : tr("themeLight")}</span>
    </button>
  )
}
