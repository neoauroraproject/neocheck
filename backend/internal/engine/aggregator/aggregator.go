package aggregator

import (
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
			// In a real system, we'd log this error or add it to a Warnings slice in the report.
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
			
			totalRiskScore += data.RiskScore
			fraudProvidersCount++

		case report.BrowserResult:
			rep.Browser = data.Browser
			rep.BrowserVersion = data.BrowserVersion
			rep.OperatingSystem = data.OperatingSystem
			rep.Platform = data.Platform
			rep.Language = data.Language
			// Use the parsed UA if provided, else keep raw request UA
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
	// Simple scoring logic based on risk and anonymity factors
	score := 100 - rep.RiskScore
	
	if rep.VPN || rep.Proxy || rep.Tor {
		score -= 30
	}
	if rep.Hosting || rep.Datacenter {
		score -= 10
	}
	if rep.DNSLeak == "Leak" || rep.WebRTCLeak == "Leak" {
		score -= 20
	}

	if score < 0 {
		score = 0
	}

	rep.Score = score

	if score >= 90 {
		rep.Status = "Excellent"
		rep.Summary = "Connection appears completely clean and residential."
	} else if score >= 70 {
		rep.Status = "Good"
		rep.Summary = "Connection is generally safe but has minor anomalies."
	} else if score >= 40 {
		rep.Status = "Warning"
		rep.Summary = "Connection shows signs of anonymization or elevated risk."
	} else {
		rep.Status = "Poor"
		rep.Summary = "Connection is highly suspicious or heavily anonymized."
	}
}
