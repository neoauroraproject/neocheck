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
		return report.FraudResult{}, nil
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
	isMobile := false

	usageType := res.Data.UsageType
	if usageType != "" {
		if stringsContainsAny(usageType, "Data Center", "Web Hosting", "Transit") {
			isHosting = true
			isDatacenter = true
		} else if stringsContainsAny(usageType, "Fixed Line ISP", "Mobile ISP", "Consumer") {
			isResidential = true
		}
		if usageType == "Mobile ISP" {
			isMobile = true
		}
	}

	signals := buildAbuseIPDBSignals(res.Data.AbuseConfidenceScore, res.Data.IsTor, usageType, isHosting, isResidential, isMobile)

	return report.FraudResult{
		RiskScore:             res.Data.AbuseConfidenceScore,
		Hosting:               isHosting,
		VPN:                   false,
		Proxy:                 false,
		Tor:                   res.Data.IsTor,
		Anonymous:             res.Data.IsTor,
		Mobile:                isMobile,
		Residential:           isResidential,
		Datacenter:            isDatacenter,
		Queried:               true,
		ClassificationSignals: signals,
	}, nil
}

func buildAbuseIPDBSignals(score int, isTor bool, usageType string, hosting, residential, mobile bool) []report.ClassificationSignal {
	var signals []report.ClassificationSignal
	add := func(key, cat string, weight int, supports bool) {
		signals = append(signals, report.ClassificationSignal{Key: key, Category: cat, Weight: weight, Supports: supports})
	}

	if hosting {
		add("evDatacenterUsage", "hosting", 34, true)
		add("evHostingDetected", "hosting", 28, true)
	}
	if isTor {
		add("evTorDetected", "vpn", 42, true)
	}
	if mobile {
		add("evMobileIsp", "mobile", 32, true)
	}
	if residential {
		add("evResidentialUsage", "residential", 30, true)
	}
	if score >= 70 {
		add("evHighFraudScore", "hosting", 16, true)
	} else if score >= 0 && score < 25 {
		add("evLowFraudScore", "residential", 14, true)
	}
	if usageType != "" && !hosting && !isTor {
		add("evNoHostingDetection", "residential", 10, true)
	}

	return signals
}

func stringsContainsAny(s string, keywords ...string) bool {
	for _, kw := range keywords {
		if containsIgnoreCase(s, kw) {
			return true
		}
	}
	return false
}

func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

func (p *AbuseIPDBProvider) Shutdown() error {
	return nil
}
