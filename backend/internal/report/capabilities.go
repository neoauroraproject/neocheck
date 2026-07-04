package report

// FraudProviderInsight describes a fraud-check provider's public status for one scan.
type FraudProviderInsight struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Active      bool   `json:"active"`      // enabled and API key configured in admin
	Queried     bool   `json:"queried"`     // live API data returned for this request
	Implemented bool   `json:"implemented"` // backend plugin exists
	RiskScore   *int   `json:"risk_score,omitempty"`
	Error       string `json:"error,omitempty"`
}

// PublicProviderStatus is returned by /api/capabilities (no secrets).
type PublicProviderStatus struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Enabled     bool   `json:"enabled"`
	Configured  bool   `json:"configured"`
	Implemented bool   `json:"implemented"`
}

// PublicCapabilities exposes feature flags and provider availability to the public UI.
type PublicCapabilities struct {
	Features  PublicFeatures           `json:"features"`
	Providers []PublicProviderStatus   `json:"providers"`
}

type PublicFeatures struct {
	IPv6         bool `json:"ipv6"`
	WebRTC       bool `json:"webrtc"`
	DNSLeak      bool `json:"dns_leak"`
	ServiceCheck bool `json:"service_check"`
	FraudCheck   bool `json:"fraud_check"`
}
