"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { type Locale, type TranslationKey, isRtl, t } from "@/lib/i18n/translations"

type LocaleContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  tr: (key: TranslationKey) => string
  rtl: boolean
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const saved = localStorage.getItem("neocheck-locale") as Locale | null
    if (saved === "en" || saved === "fa") setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem("neocheck-locale", l)
  }

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr"
  }, [locale])

  const value: LocaleContextValue = {
    locale,
    setLocale,
    tr: (key: TranslationKey) => t(locale, key),
    rtl: isRtl(locale),
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}
