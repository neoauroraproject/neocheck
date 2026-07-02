package report

// GeoResult is returned by geo plugins
type GeoResult struct {
	Country     string  `json:"country"`
	CountryCode string  `json:"country_code"`
	CountryFlag string  `json:"country_flag"`
	Region      string  `json:"region"`
	City        string  `json:"city"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Timezone    string  `json:"timezone"`
	ISP         string  `json:"isp"`
	ASN         int     `json:"asn"`
	Org         string  `json:"org"`
}

// FraudResult is returned by fraud checking plugins
type FraudResult struct {
	RiskScore    int    `json:"risk_score"`
	Hosting      bool   `json:"hosting"`
	VPN          bool   `json:"vpn"`
	Proxy        bool   `json:"proxy"`
	Tor          bool   `json:"tor"`
	Anonymous    bool   `json:"anonymous"`
	Mobile       bool   `json:"mobile"`
	Residential  bool   `json:"residential"`
	Datacenter   bool   `json:"datacenter"`
	ASNType      string `json:"asn_type"`
	CGNAT        bool   `json:"cgnat"`
	CarrierClass string `json:"carrier_class"`
}

// BrowserResult is returned by the browser parsing plugin
type BrowserResult struct {
	Browser         string `json:"browser"`
	BrowserVersion  string `json:"browser_version"`
	OperatingSystem string `json:"operating_system"`
	Platform        string `json:"platform"`
	Language        string `json:"language"`
	UserAgent       string `json:"user_agent"`
}

// NetworkResult holds low level connection details
type NetworkResult struct {
	Hostname       string `json:"hostname"`
	ReverseDNS     string `json:"reverse_dns"`
	ConnectionType string `json:"connection_type"`
	IPv4           bool   `json:"ipv4"`
	IPv6           bool   `json:"ipv6"`
}

// SecurityResult holds protocol level security details
type SecurityResult struct {
	HTTPS          bool   `json:"https"`
	HTTPVersion    string `json:"http_version"`
	TLSVersion     string `json:"tls_version"`
	CipherSuite    string `json:"cipher_suite"`
	ALPN           string `json:"alpn"`
	HSTS           bool   `json:"hsts"`
	OCSPStapling   bool   `json:"ocsp_stapling"`
	CertIssuer     string `json:"cert_issuer"`
	CertExpiration string `json:"cert_expiration"`
	PFS            bool   `json:"pfs"`
	SecureContext  bool   `json:"secure_context"`
}

// DNSResult is returned by the DNS leak plugin
type DNSResult struct {
	Leak string `json:"leak"` // Safe, Leak, Unknown
}

// WebRTCResult is returned by the WebRTC checking plugin
type WebRTCResult struct {
	Enabled bool   `json:"enabled"`
	Leak    string `json:"leak"` // Safe, Leak, Unknown
}

// ServicesResult is returned by the service availability checker
type ServicesResult struct {
	Status map[string]bool `json:"status"`
}

// ScoreBreakdown represents 0-100 scores for each category
type ScoreBreakdown struct {
	DNS        int `json:"dns"`
	WebRTC     int `json:"webrtc"`
	Privacy    int `json:"privacy"`
	Reputation int `json:"reputation"`
	Streaming  int `json:"streaming"`
	AI         int `json:"ai"`
	Security   int `json:"security"`
}
