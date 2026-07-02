package ipqualityscore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

type IPQSProvider struct {
	apiKey  string
	enabled bool
	client  *http.Client
}

func New() *IPQSProvider {
	return &IPQSProvider{
		client: &http.Client{
			Timeout: 4 * time.Second,
		},
	}
}

func (p *IPQSProvider) Name() string {
	return "ipqualityscore"
}

func (p *IPQSProvider) Initialize(cfg *config.Config) error {
	p.enabled = cfg.Providers.IPQualityScore.Enabled
	p.apiKey = cfg.Providers.IPQualityScore.APIKey
	return nil
}

type ipqsResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	FraudScore int    `json:"fraud_score"`
	Hosting    bool   `json:"hosting"`
	VPN        bool   `json:"vpn"`
	Proxy      bool   `json:"proxy"`
	Tor        bool   `json:"tor"`
	Mobile     bool   `json:"mobile"`
}

func (p *IPQSProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	if !p.enabled || p.apiKey == "" || req.IP == "127.0.0.1" || req.IP == "::1" || req.IP == "" {
		return report.FraudResult{}, nil
	}

	url := fmt.Sprintf("https://ipqualityscore.com/api/json/ip/%s/%s", p.apiKey, req.IP)
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("IPQS returned status %d", resp.StatusCode)
	}

	var data ipqsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	if !data.Success {
		return nil, fmt.Errorf("IPQS API error: %s", data.Message)
	}

	return report.FraudResult{
		RiskScore:   data.FraudScore,
		Hosting:     data.Hosting,
		VPN:         data.VPN,
		Proxy:       data.Proxy,
		Tor:         data.Tor,
		Anonymous:   data.VPN || data.Proxy || data.Tor,
		Mobile:      data.Mobile,
		Residential: !data.Hosting && !data.VPN && !data.Proxy && !data.Tor,
		Datacenter:  data.Hosting,
	}, nil
}

func (p *IPQSProvider) Shutdown() error {
	return nil
}
