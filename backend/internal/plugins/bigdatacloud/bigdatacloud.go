package bigdatacloud

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

type BigDataCloudProvider struct {
	apiKey  string
	enabled bool
	client  *http.Client
}

func New() *BigDataCloudProvider {
	return &BigDataCloudProvider{
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (p *BigDataCloudProvider) Name() string {
	return "bigdatacloud"
}

func (p *BigDataCloudProvider) Initialize(cfg *config.Config) error {
	p.enabled = cfg.Providers.BigDataCloud.Enabled
	p.apiKey = cfg.Providers.BigDataCloud.APIKey
	return nil
}

type bdcHazardReport struct {
	IsKnownAsTorServer       bool `json:"isKnownAsTorServer"`
	IsKnownAsVpn             bool `json:"isKnownAsVpn"`
	IsKnownAsProxy           bool `json:"isKnownAsProxy"`
	IsSpamhausDrop           bool `json:"isSpamhausDrop"`
	IsSpamhausEdrop          bool `json:"isSpamhausEdrop"`
	IsSpamhausAsnDrop        bool `json:"isSpamhausAsnDrop"`
	IsBlacklistedUceprotect  bool `json:"isBlacklistedUceprotect"`
	IsBlacklistedBlocklistDe bool `json:"isBlacklistedBlocklistDe"`
	IsBogon                  bool `json:"isBogon"`
	IsUnreachable            bool `json:"isUnreachable"`
	HostingLikelihood        int  `json:"hostingLikelihood"`
	IsHostingAsn             bool `json:"isHostingAsn"`
	IsCellular               bool `json:"isCellular"`
}

type bdcResponse struct {
	SecurityThreat string `json:"securityThreat"`
	Network        struct {
		Organisation string `json:"organisation"`
		Carrier      struct {
			Name string `json:"name"`
		} `json:"carrier"`
	} `json:"network"`
	HazardReport bdcHazardReport `json:"hazardReport"`
}

func (p *BigDataCloudProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	if !p.enabled || p.apiKey == "" {
		return report.FraudResult{}, nil
	}

	ip := req.IP
	if ip == "" || ip == "127.0.0.1" || ip == "::1" {
		ip = "8.8.8.8"
	}

	apiURL := fmt.Sprintf(
		"https://api-bdc.net/data/ip-geolocation-full?ip=%s&localityLanguage=en&key=%s",
		url.QueryEscape(ip),
		url.QueryEscape(p.apiKey),
	)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("BigDataCloud returned status %d", resp.StatusCode)
	}

	var data bdcResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	h := data.HazardReport
	hosting := h.IsHostingAsn || h.HostingLikelihood >= 6
	vpn := h.IsKnownAsVpn
	proxy := h.IsKnownAsProxy
	tor := h.IsKnownAsTorServer
	mobile := h.IsCellular

	threat := strings.ToLower(data.SecurityThreat)
	if threat != "" && threat != "unknown" {
		if strings.Contains(threat, "vpn") {
			vpn = true
		}
		if strings.Contains(threat, "tor") {
			tor = true
		}
		if strings.Contains(threat, "proxy") {
			proxy = true
		}
	}

	riskScore := computeFraudScore(data.SecurityThreat, h, vpn, proxy, tor)

	residential := !hosting && !vpn && !proxy && !tor && !mobile && h.HostingLikelihood < 4

	signals := buildSignals(hosting, vpn, proxy, tor, mobile, residential, riskScore, h.IsHostingAsn, h.HostingLikelihood)

	return report.FraudResult{
		RiskScore:             riskScore,
		Hosting:               hosting,
		VPN:                   vpn,
		Proxy:                 proxy,
		Tor:                   tor,
		Anonymous:             vpn || proxy || tor,
		Mobile:                mobile,
		Residential:           residential,
		Datacenter:            hosting,
		ASNType:               asnType(hosting, mobile, residential),
		Queried:               true,
		ClassificationSignals: signals,
	}, nil
}

func computeFraudScore(securityThreat string, h bdcHazardReport, vpn, proxy, tor bool) int {
	score := 0
	bump := func(points int) {
		if points > score {
			score = points
		}
	}
	add := func(points int) {
		score += points
	}

	if h.IsSpamhausDrop || h.IsSpamhausEdrop || h.IsSpamhausAsnDrop {
		add(45)
	}
	if h.IsBlacklistedUceprotect || h.IsBlacklistedBlocklistDe {
		add(40)
	}
	if h.IsBogon || h.IsUnreachable {
		add(25)
	}
	if tor || h.IsKnownAsTorServer {
		bump(55)
	}
	if vpn || h.IsKnownAsVpn {
		bump(35)
	}
	if proxy || h.IsKnownAsProxy {
		bump(28)
	}

	threat := strings.ToLower(strings.TrimSpace(securityThreat))
	if threat != "" && threat != "unknown" {
		switch {
		case strings.Contains(threat, "blacklist"), strings.Contains(threat, "spamhaus"), strings.Contains(threat, "abuse"):
			bump(60)
		case strings.Contains(threat, "tor"):
			bump(55)
		case strings.Contains(threat, "vpn"):
			bump(35)
		case strings.Contains(threat, "proxy"):
			bump(28)
		default:
			bump(22)
		}
	}

	if score > 100 {
		return 100
	}
	return score
}

func asnType(hosting, mobile, residential bool) string {
	if hosting {
		return "Hosting"
	}
	if mobile {
		return "Mobile"
	}
	if residential {
		return "Residential"
	}
	return "Business"
}

func buildSignals(hosting, vpn, proxy, tor, mobile, residential bool, riskScore int, isHostingAsn bool, hostingLikelihood int) []report.ClassificationSignal {
	var signals []report.ClassificationSignal
	add := func(key, cat string, weight int, supports bool) {
		signals = append(signals, report.ClassificationSignal{Key: key, Category: cat, Weight: weight, Supports: supports})
	}

	if hosting {
		add("evHostingDetected", "hosting", 34, true)
		add("evDatacenterRange", "hosting", 26, true)
	}
	if isHostingAsn {
		add("evHostingAsn", "hosting", 28, true)
	}
	if hostingLikelihood >= 6 {
		add("evDatacenterUsage", "hosting", 20+hostingLikelihood, true)
	}
	if vpn {
		add("evVpnDetected", "vpn", 40, true)
	}
	if proxy {
		add("evProxyDetected", "vpn", 30, true)
	}
	if tor {
		add("evTorDetected", "vpn", 45, true)
	}
	if mobile {
		add("evMobileDetected", "mobile", 34, true)
	}
	if residential {
		add("evResidentialSignal", "residential", 28, true)
	}
	if !hosting && !vpn && !proxy && !tor {
		add("evNoHostingDetection", "residential", 14, true)
		add("evNoVpnDetection", "residential", 12, true)
	}
	if riskScore < 30 {
		add("evLowFraudScore", "residential", 12, true)
	} else if riskScore >= 70 {
		add("evHighFraudScore", "hosting", 16, true)
	}

	return signals
}

func (p *BigDataCloudProvider) Shutdown() error {
	return nil
}
