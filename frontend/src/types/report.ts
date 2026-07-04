export interface ScoreBreakdown {
  network: number
  dns: number
  webrtc: number
  fingerprint: number
  security: number
  reputation: number
  compatibility: number
}

export interface FraudProviderInsight {
  id: string
  name: string
  active: boolean
  queried: boolean
  implemented: boolean
  risk_score?: number
  error?: string
}

export interface TLSLayerInfo {
  role: "client" | "backend"
  encrypted: boolean
  http_version: string
  tls_version: string
  cipher_suite: string
  alpn: string
  source: string
  label: string
  note: string
}

export interface TLSDiagnostics {
  behind_reverse_proxy: boolean
  proxy_signals: string[]
  client: TLSLayerInfo
  backend: TLSLayerInfo
  hsts: boolean
  hsts_header?: string
  http3_available: boolean
  explanation_key: string
}

export interface ClassificationSignal {
  key: string
  category: string
  weight: number
  supports: boolean
}

export interface ProviderClassificationContribution {
  id: string
  name: string
  active: boolean
  queried: boolean
  signals: ClassificationSignal[]
}

export interface ConnectionClassification {
  category: string
  label_key: string
  confidence: number
  evidence: ClassificationSignal[]
  providers: ProviderClassificationContribution[]
  provider_count: number
}

export interface PublicProviderStatus {
  id: string
  name: string
  enabled: boolean
  configured: boolean
  implemented: boolean
}

export interface PublicCapabilities {
  features: {
    ipv6: boolean
    webrtc: boolean
    dns_leak: boolean
    service_check: boolean
    fraud_check: boolean
  }
  providers: PublicProviderStatus[]
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
  tls_diagnostics?: TLSDiagnostics
  connection_classification?: ConnectionClassification
  webrtc: boolean
  webrtc_leak: string
  dns_leak: string
  risk_score: number
  fraud_check_enabled: boolean
  fraud_providers: FraudProviderInsight[]
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

export interface ICECandidateEntry {
  ip: string
  type: string
  protocol?: string
  category: "public" | "private" | "host" | "stun" | "turn"
}

export interface WebRTCData {
  status: "Safe" | "Partial" | "Leak" | "Scanning" | "Unsupported"
  localIPv4: string[]
  localIPv6: string[]
  publicIPs: string[]
  iceCandidates: ICECandidateEntry[]
  mdnsEnabled: boolean
  cgnat: boolean
}

export interface EnvironmentSignals {
  timezone: string
  locale: string
  languages: string[]
  hardwareConcurrency: number
  deviceMemory: number | null
  touchSupport: boolean
  colorDepth: number
  doNotTrack: string | null
  cookiesEnabled: boolean
  localStorage: boolean
  sessionStorage: boolean
  currencyLocale: string
  clockOffsetMinutes: number
  webgpu: "available" | "unavailable"
  batteryApi: boolean
  clipboardApi: boolean
  bluetoothApi: boolean
  usbApi: boolean
  mediaDevicesCount: number
  permissionsApi: boolean
  javascriptEnabled: boolean
  webglSupported: boolean
  architecture: string
  userAgent: string
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
