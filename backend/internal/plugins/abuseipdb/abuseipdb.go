package abuseipdb

import (
	"context"
	"time"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

type AbuseIPDBProvider struct{}

func New() *AbuseIPDBProvider {
	return &AbuseIPDBProvider{}
}

func (p *AbuseIPDBProvider) Name() string {
	return "abuseipdb"
}

func (p *AbuseIPDBProvider) Initialize(cfg *config.Config) error {
	// Initialize API key from config
	return nil
}

func (p *AbuseIPDBProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	time.Sleep(150 * time.Millisecond)

	// Return mock fraud result
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

func (p *AbuseIPDBProvider) Shutdown() error {
	return nil
}
