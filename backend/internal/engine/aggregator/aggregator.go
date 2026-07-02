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
	// 1. Heuristic fallbacks for Privacy Profile if IPQS / AbuseIPDB did not run or returned empty
	if rep.ISP != "" {
		ispLower := strings.ToLower(rep.ISP)
		orgLower := strings.ToLower(rep.Organization)

		// Datacenter/Hosting keywords
		hostingKws := []string{"hosting", "cloud", "server", "ovh", "digitalocean", "linode", "vultr", "hetzner", "amazon", "google llc", "microsoft", "leaseweb", "colocation", "dedibox", "scalyr", "zenlayer", "m247", "packethub"}
		isHosting := false
		for _, kw := range hostingKws {
			if strings.Contains(ispLower, kw) || strings.Contains(orgLower, kw) {
				isHosting = true
				break
			}
		}

		// VPN/Proxy keywords
		vpnKws := []string{"nordvpn", "expressvpn", "surfshark", "proton", "mullvad", "windscribe", "vyprvpn", "private internet", "hide.me", "tunnelbear", "m247", "leaseweb", "anonymous"}
		isVPN := false
		for _, kw := range vpnKws {
			if strings.Contains(ispLower, kw) || strings.Contains(orgLower, kw) {
				isVPN = true
				break
			}
		}

		isTor := strings.Contains(ispLower, "tor exit") || strings.Contains(orgLower, "tor exit")

		if isTor {
			rep.Tor = true
			rep.Anonymous = true
			rep.Residential = false
			rep.ASNType = "Business"
			if rep.RiskScore == 0 {
				rep.RiskScore = 100
			}
		} else if isVPN {
			rep.VPN = true
			rep.Proxy = true
			rep.Anonymous = true
			rep.Residential = false
			rep.ASNType = "Business"
			if rep.RiskScore == 0 {
				rep.RiskScore = 65
			}
		} else if isHosting {
			rep.Hosting = true
			rep.Datacenter = true
			rep.Residential = false
			rep.ASNType = "Hosting"
			if rep.RiskScore == 0 {
				rep.RiskScore = 30
			}
		}

		// Carrier / ISP classification
		if rep.ASNType == "" {
			mobileKws := []string{"t-mobile", "vodafone", "verizon", "at&t", "orange", "telekom", "cellular", "mobile", "sprint", "rogers", "bell", "telus", "singtel", "optus", "mci", "mtn"}
			isMobile := false
			for _, kw := range mobileKws {
				if strings.Contains(ispLower, kw) {
					isMobile = true
					break
				}
			}
			if isMobile {
				rep.Mobile = true
				rep.ASNType = "Mobile"
				rep.CarrierClass = "Mobile Carrier"
			} else {
				rep.Residential = true
				rep.ASNType = "Residential"
				rep.CarrierClass = "Broadband ISP"
			}
		}
	}

	// 2. Calculate Score Breakdown
	dnsScore := 100
	if rep.DNSLeak == "Leak" {
		dnsScore = 0
	}

	webrtcScore := 100
	if rep.WebRTCLeak == "Leak" {
		webrtcScore = 0
	} else if rep.WebRTCLeak == "Partial" {
		webrtcScore = 50
	}

	privacyScore := 100
	if rep.VPN {
		privacyScore -= 35
	}
	if rep.Proxy {
		privacyScore -= 35
	}
	if rep.Tor {
		privacyScore -= 50
	}
	if rep.Hosting || rep.Datacenter {
		privacyScore -= 15
	}
	if privacyScore < 0 {
		privacyScore = 0
	}

	reputationScore := 100 - rep.RiskScore
	if reputationScore < 0 {
		reputationScore = 0
	}

	streamingScore := 100
	if rep.VPN || rep.Proxy {
		streamingScore -= 50
	}
	if rep.Tor {
		streamingScore -= 80
	}
	if rep.Hosting {
		streamingScore -= 30
	}
	if streamingScore < 0 {
		streamingScore = 0
	}

	aiScore := 100
	if rep.VPN || rep.Proxy {
		aiScore -= 30
	}
	if rep.Tor {
		aiScore -= 60
	}
	if aiScore < 0 {
		aiScore = 0
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

	breakdown := report.ScoreBreakdown{
		DNS:        dnsScore,
		WebRTC:     webrtcScore,
		Privacy:    privacyScore,
		Reputation: reputationScore,
		Streaming:  streamingScore,
		AI:         aiScore,
		Security:   securityScore,
	}
	rep.ScoreBreakdown = breakdown

	// 3. Overall Weighted Score
	// Reputation: 20%, Privacy: 20%, Security: 15%, DNS: 15%, WebRTC: 10%, Streaming: 10%, AI: 10%
	weightedScore := float64(reputationScore)*0.20 +
		float64(privacyScore)*0.20 +
		float64(securityScore)*0.15 +
		float64(dnsScore)*0.15 +
		float64(webrtcScore)*0.10 +
		float64(streamingScore)*0.10 +
		float64(aiScore)*0.10

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
		rep.Status = "Excellent"
		rep.Summary = "Connection appears highly secure, clean, and residential."
	} else if score >= 75 {
		rep.Status = "Good"
		rep.Summary = "Connection is generally safe and usable, with minor anonymization flags."
	} else if score >= 50 {
		rep.Status = "Warning"
		rep.Summary = "Connection shows active anonymization (VPN/Proxy) or security warnings."
	} else {
		rep.Status = "Poor"
		rep.Summary = "Connection is highly suspicious, heavily anonymized, or insecure."
	}
}

