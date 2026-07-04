package aggregator

import (
	"strings"
	"time"

	"neocheck-backend/internal/engine/pipeline"
	"neocheck-backend/internal/report"
)

// Aggregator takes the raw plugin execution wrappers and intelligently merges them
// into the final immutable ConnectionReport.
type Aggregator struct{}

// New returns a new Aggregator instance.
func New() *Aggregator {
	return &Aggregator{}
}

// Build traverses all plugin results, type asserts them to strongly typed models,
// and maps their fields to the final ConnectionReport.
func (a *Aggregator) Build(req *report.Request, results []pipeline.ResultWrapper) *report.ConnectionReport {
	// Initialize with data we know from the request itself
	rep := &report.ConnectionReport{
		IP:        req.IP,
		UserAgent: req.UserAgent,
		Services:  make(map[string]bool),
		Timestamp: time.Now(),
	}

	var totalRiskScore int
	var fraudProvidersCount int

	for _, res := range results {
		if !res.Success || res.Data == nil {
			continue
		}

		// Type assert based on the strong typed models defined in report/models.go
		switch data := res.Data.(type) {
		case report.GeoResult:
			rep.Country = data.Country
			rep.CountryCode = data.CountryCode
			rep.CountryFlag = data.CountryFlag
			rep.Region = data.Region
			rep.City = data.City
			rep.Latitude = data.Latitude
			rep.Longitude = data.Longitude
			rep.Timezone = data.Timezone
			rep.ISP = data.ISP
			rep.Organization = data.Org
			rep.ASN = data.ASN

		case report.FraudResult:
			rep.Hosting = rep.Hosting || data.Hosting
			rep.VPN = rep.VPN || data.VPN
			rep.Proxy = rep.Proxy || data.Proxy
			rep.Tor = rep.Tor || data.Tor
			rep.Anonymous = rep.Anonymous || data.Anonymous
			rep.Mobile = rep.Mobile || data.Mobile
			rep.Residential = rep.Residential || data.Residential
			rep.Datacenter = rep.Datacenter || data.Datacenter
			rep.ASNType = data.ASNType
			rep.CGNAT = rep.CGNAT || data.CGNAT
			rep.CarrierClass = data.CarrierClass
			
			if data.RiskScore > 0 {
				totalRiskScore += data.RiskScore
				fraudProvidersCount++
			}

		case report.BrowserResult:
			rep.Browser = data.Browser
			rep.BrowserVersion = data.BrowserVersion
			rep.OperatingSystem = data.OperatingSystem
			rep.Platform = data.Platform
			rep.Language = data.Language
			if data.UserAgent != "" {
				rep.UserAgent = data.UserAgent
			}

		case report.NetworkResult:
			rep.Hostname = data.Hostname
			rep.ReverseDNS = data.ReverseDNS
			rep.ConnectionType = data.ConnectionType
			rep.IPv4 = data.IPv4
			rep.IPv6 = data.IPv6

		case report.SecurityResult:
			rep.HTTPS = data.HTTPS
			rep.HTTPVersion = data.HTTPVersion
			rep.TLSVersion = data.TLSVersion
			rep.CipherSuite = data.CipherSuite
			rep.ALPN = data.ALPN
			rep.HSTS = data.HSTS
			rep.OCSPStapling = data.OCSPStapling
			rep.CertIssuer = data.CertIssuer
			rep.CertExpiration = data.CertExpiration
			rep.PFS = data.PFS
			rep.SecureContext = data.SecureContext

		case report.DNSResult:
			rep.DNSLeak = data.Leak

		case report.WebRTCResult:
			rep.WebRTC = data.Enabled
			rep.WebRTCLeak = data.Leak

		case report.ServicesResult:
			for k, v := range data.Status {
				rep.Services[k] = v
			}
		}
	}

	// Calculate final aggregate scores
	if fraudProvidersCount > 0 {
		rep.RiskScore = totalRiskScore / fraudProvidersCount
	}

	a.generateSummaryAndStatus(rep)

	return rep
}

// generateSummaryAndStatus assigns human readable summaries and a 0-100 overall score
func (a *Aggregator) generateSummaryAndStatus(rep *report.ConnectionReport) {
	// Score breakdown uses aggregated provider flags only — no single-provider ISP heuristics.
	networkScore := 100
	if rep.Tor {
		networkScore = 20
	} else if rep.Proxy {
		networkScore = 50
	} else if rep.Hosting || rep.Datacenter {
		networkScore = 80 // Datacenter VPN node
	} else if rep.VPN {
		networkScore = 95 // Residential VPN
	}

	dnsScore := 100
	if rep.DNSLeak == "Leak" {
		dnsScore = 0
	}

	webrtcScore := 100
	if rep.WebRTCLeak == "Leak" {
		webrtcScore = 0
	} else if rep.WebRTCLeak == "Partial" {
		webrtcScore = 70 // Minimal penalty for local candidate
	}

	fingerprintScore := 100 // Refined client-side, default to 100
	if rep.HTTPVersion == "HTTP/1.1" {
		fingerprintScore -= 5 // Older browser protocols
	}

	securityScore := 0
	if rep.HTTPS {
		securityScore += 20
	}
	if strings.Contains(rep.TLSVersion, "1.3") {
		securityScore += 20
	} else if strings.Contains(rep.TLSVersion, "1.2") {
		securityScore += 10
	}
	if rep.PFS {
		securityScore += 15
	}
	if rep.SecureContext {
		securityScore += 15
	}
	if rep.HSTS {
		securityScore += 15
	}
	if rep.ALPN == "h2" || rep.ALPN == "h3" {
		securityScore += 15
	}
	if securityScore > 100 {
		securityScore = 100
	}

	reputationScore := 100 - rep.RiskScore
	if reputationScore < 0 {
		reputationScore = 0
	}

	compatibilityScore := 100
	if rep.Tor {
		compatibilityScore = 20
	} else if rep.Proxy {
		compatibilityScore = 50
	} else if rep.Hosting || rep.Datacenter {
		compatibilityScore = 70
	} else if rep.VPN {
		compatibilityScore = 85
	}

	breakdown := report.ScoreBreakdown{
		Network:       networkScore,
		DNS:           dnsScore,
		WebRTC:        webrtcScore,
		Fingerprint:   fingerprintScore,
		Security:      securityScore,
		Reputation:    reputationScore,
		Compatibility: compatibilityScore,
	}
	rep.ScoreBreakdown = breakdown

	// 3. Overall Weighted Score (fair and realistic average)
	weightedScore := float64(networkScore)*0.15 +
		float64(dnsScore)*0.20 +
		float64(webrtcScore)*0.15 +
		float64(fingerprintScore)*0.10 +
		float64(securityScore)*0.15 +
		float64(reputationScore)*0.15 +
		float64(compatibilityScore)*0.10

	score := int(weightedScore)
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	rep.Score = score

	// 4. Summaries & Status
	if score >= 90 {
		rep.Status = "Protected"
		rep.Summary = "Your digital identity is well protected. Minor leaks or tracking vectors."
	} else if score >= 75 {
		rep.Status = "Minor Exposure"
		rep.Summary = "Connection is mostly safe but has minor configurations exposed."
	} else if score >= 50 {
		rep.Status = "Medium Exposure"
		rep.Summary = "Active leaks or browser tracking points have been detected."
	} else {
		rep.Status = "High Exposure"
		rep.Summary = "Critical DNS/WebRTC leaks or unsecured network routes detected."
	}
}

