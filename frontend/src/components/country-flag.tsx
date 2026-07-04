"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type CountryFlagProps = {
  code?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: { w: 20, h: 14, className: "w-5 h-3.5" },
  md: { w: 28, h: 20, className: "w-7 h-5" },
  lg: { w: 40, h: 28, className: "w-10 h-7" },
}

/** Reliable flag image — avoids emoji flags that fail on Windows desktop. */
export function CountryFlag({ code, size = "md", className }: CountryFlagProps) {
  const [failed, setFailed] = useState(false)
  const cc = code?.trim().toLowerCase()
  const dim = sizes[size]

  if (!cc || cc.length !== 2 || !/^[a-z]{2}$/.test(cc) || failed) {
    return (
      <span
        role="img"
        aria-hidden
        className={cn(dim.className, "inline-flex items-center justify-center opacity-50 text-nc-muted", className)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-full">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/w80/${cc}.png`}
      srcSet={`https://flagcdn.com/w160/${cc}.png 2x`}
      width={dim.w}
      height={dim.h}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        dim.className,
        "rounded-[3px] object-cover shrink-0 ring-1 ring-white/10 shadow-sm",
        className,
      )}
      onError={() => setFailed(true)}
    />
  )
}
