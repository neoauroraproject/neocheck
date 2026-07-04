package detection

import (
	"neocheck-backend/internal/config"
	"neocheck-backend/internal/engine/pipeline"
	"neocheck-backend/internal/report"
)

type providerMeta struct {
	Name        string
	Implemented bool
	Enabled     func(*config.Config) bool
	Configured  func(*config.Config) bool
}

var fraudProviderCatalog = []providerMeta{
	{
		Name:        "AbuseIPDB",
		Implemented: true,
		Enabled:     func(c *config.Config) bool { return c.Providers.AbuseIPDB.Enabled },
		Configured:  func(c *config.Config) bool { return c.Providers.AbuseIPDB.APIKey != "" },
	},
	{
		Name:        "BigDataCloud",
		Implemented: false,
		Enabled:     func(c *config.Config) bool { return c.Providers.BigDataCloud.Enabled },
		Configured:  func(c *config.Config) bool { return c.Providers.BigDataCloud.APIKey != "" },
	},
	{
		Name:        "IPQualityScore",
		Implemented: true,
		Enabled:     func(c *config.Config) bool { return c.Providers.IPQualityScore.Enabled },
		Configured:  func(c *config.Config) bool { return c.Providers.IPQualityScore.APIKey != "" },
	},
	{
		Name:        "Scamalytics",
		Implemented: false,
		Enabled:     func(c *config.Config) bool { return c.Providers.Scamalytics.Enabled },
		Configured:  func(c *config.Config) bool { return c.Providers.Scamalytics.APIKey != "" },
	},
}

var providerIDs = []string{"abuseipdb", "bigdatacloud", "ipqualityscore", "scamalytics"}

func BuildPublicCapabilities(cfg *config.Config) report.PublicCapabilities {
	providers := make([]report.PublicProviderStatus, 0, len(providerIDs))
	for i, id := range providerIDs {
		meta := fraudProviderCatalog[i]
		providers = append(providers, report.PublicProviderStatus{
			ID:          id,
			Name:        meta.Name,
			Enabled:     meta.Enabled(cfg),
			Configured:  meta.Configured(cfg),
			Implemented: meta.Implemented,
		})
	}

	return report.PublicCapabilities{
		Features: report.PublicFeatures{
			IPv6:         cfg.Features.IPv6,
			WebRTC:       cfg.Features.WebRTC,
			DNSLeak:      cfg.Features.DNSLeak,
			ServiceCheck: cfg.Features.ServiceCheck,
			FraudCheck:   cfg.Features.FraudCheck,
		},
		Providers: providers,
	}
}

func BuildFraudProviderInsights(cfg *config.Config, results []pipeline.ResultWrapper) []report.FraudProviderInsight {
	resultByName := make(map[string]pipeline.ResultWrapper, len(results))
	for _, res := range results {
		resultByName[res.ProviderName] = res
	}

	out := make([]report.FraudProviderInsight, 0, len(providerIDs))
	for i, id := range providerIDs {
		meta := fraudProviderCatalog[i]
		active := meta.Enabled(cfg) && meta.Configured(cfg)

		insight := report.FraudProviderInsight{
			ID:          id,
			Name:        meta.Name,
			Active:      active,
			Implemented: meta.Implemented,
		}

		if !active {
			out = append(out, insight)
			continue
		}

		if !meta.Implemented {
			out = append(out, insight)
			continue
		}

		res, ok := resultByName[id]
		if !ok {
			out = append(out, insight)
			continue
		}

		if res.Error != nil {
			insight.Error = res.Error.Error()
			out = append(out, insight)
			continue
		}

		fraud, ok := res.Data.(report.FraudResult)
		if !ok {
			out = append(out, insight)
			continue
		}

		insight.Queried = true
		score := fraud.RiskScore
		insight.RiskScore = &score
		out = append(out, insight)
	}

	return out
}
