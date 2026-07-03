export interface ScoreBreakdown {
  network: number
  dns: number
  webrtc: number
  fingerprint: number
  security: number
  reputation: number
  compatibility: number
}

export interface ConnectionReport {
  ip: string
  hostname: string
  reverse_dns: string
  connection_type: string
  ipv4: boolean
  ipv6: boolean
  country: string
  country_code: string
  country_flag: string
  region: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  organization: string
  asn: number
  browser: string
  browser_version: string
  operating_system: string
  platform: string
  language: string
  user_agent: string
  https: boolean
  http_version: string
  tls_version: string
  cipher_suite: string
  alpn: string
  hsts: boolean
  ocsp_stapling: boolean
  cert_issuer: string
  cert_expiration: string
  pfs: boolean
  secure_context: boolean
  webrtc: boolean
  webrtc_leak: string
  dns_leak: string
  risk_score: number
  hosting: boolean
  vpn: boolean
  proxy: boolean
  tor: boolean
  anonymous: boolean
  mobile: boolean
  residential: boolean
  datacenter: boolean
  asn_type: string
  cgnat: boolean
  carrier_class: string
  services: Record<string, boolean>
  summary: string
  score: number
  score_breakdown: ScoreBreakdown
  status: string
  timestamp: string
}

export interface Branding {
  name: string
  copyright_text: string
  footer_text: string
  support_url: string
  github_url: string
  documentation_url: string
}

export interface FingerprintData {
  canvas: string
  webglVendor: string
  webglRenderer: string
  audio: string
  fonts: string[]
}

export interface WebRTCData {
  status: "Safe" | "Partial" | "Leak" | "Scanning" | "Unsupported"
  localIPv4: string[]
  localIPv6: string[]
  publicIPs: string[]
  mdnsEnabled: boolean
  cgnat: boolean
}

export interface BrowserDetails {
  name: string
  version: string
  os: string
  platform: string
  language: string
  screen: string
  cookies: boolean
  touch: boolean
}

export type ServiceStatus =
  | "Reachable"
  | "Accessible"
  | "Blocked"
  | "Restricted"
  | "Network Accessible"
  | "Unknown"
