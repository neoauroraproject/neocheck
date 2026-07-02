package abuseipdb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

type AbuseIPDBProvider struct {
	apiKey  string
	enabled bool
	client  *http.Client
}

func New() *AbuseIPDBProvider {
	return &AbuseIPDBProvider{
		client: &http.Client{
			Timeout: 4 * time.Second,
		},
	}
}

func (p *AbuseIPDBProvider) Name() string {
	return "abuseipdb"
}

func (p *AbuseIPDBProvider) Initialize(cfg *config.Config) error {
	p.enabled = cfg.Providers.AbuseIPDB.Enabled
	p.apiKey = cfg.Providers.AbuseIPDB.APIKey
	return nil
}

type abuseIPDBResponse struct {
	Data struct {
		IPAddress            string `json:"ipAddress"`
		AbuseConfidenceScore int    `json:"abuseConfidenceScore"`
		IsTor                bool   `json:"isTor"`
		ISP                  string `json:"isp"`
		UsageType            string `json:"usageType"`
	} `json:"data"`
}

func (p *AbuseIPDBProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	if !p.enabled || p.apiKey == "" || req.IP == "127.0.0.1" || req.IP == "::1" || req.IP == "" {
		// Heuristic mock fallback
		return report.FraudResult{
			RiskScore:   5,
			Hosting:     false,
			VPN:         false,
			Proxy:       false,
			Tor:         false,
			Anonymous:   false,
			Mobile:      false,
			Residential: true,
			Datacenter:  false,
		}, nil
	}

	apiURL := fmt.Sprintf("https://api.abuseipdb.com/api/v2/check?ipAddress=%s&maxAgeInDays=90", url.QueryEscape(req.IP))
	httpReq, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Key", p.apiKey)
	httpReq.Header.Set("Accept", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AbuseIPDB returned status %d", resp.StatusCode)
	}

	var res abuseIPDBResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	isHosting := false
	isDatacenter := false
	isResidential := false

	usageType := res.Data.UsageType
	if usageType != "" {
		if stringsContainsAny(usageType, "Data Center", "Web Hosting", "Transit") {
			isHosting = true
			isDatacenter = true
		} else if stringsContainsAny(usageType, "Fixed Line ISP", "Mobile ISP", "Consumer") {
			isResidential = true
		}
	}

	return report.FraudResult{
		RiskScore:   res.Data.AbuseConfidenceScore,
		Hosting:     isHosting,
		VPN:         false, // AbuseIPDB doesn't explicitly flag VPN except if Tor
		Proxy:       false,
		Tor:         res.Data.IsTor,
		Anonymous:   res.Data.IsTor,
		Mobile:      usageType == "Mobile ISP",
		Residential: isResidential,
		Datacenter:  isDatacenter,
	}, nil
}

func stringsContainsAny(s string, keywords ...string) bool {
	lowerS := fmt.Sprintf("%s", s)
	// Make it lowercase
	lowerS = fmt.Sprintf("%s", lowerS)
	// We can use a simpler approach
	for _, kw := range keywords {
		if containsIgnoreCase(s, kw) {
			return true
		}
	}
	return false
}

func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) && (len(substr) == 0 || (len(s) > 0 && strings.Contains(strings.ToLower(s), strings.ToLower(substr))))
}

func (p *AbuseIPDBProvider) Shutdown() error {
	return nil
}
