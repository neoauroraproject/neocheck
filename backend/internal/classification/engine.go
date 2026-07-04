package classification

import (
	"strings"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/engine/pipeline"
	"neocheck-backend/internal/report"
)

type catalogEntry struct {
	ID          string
	Name        string
	Implemented bool
	PluginName  string
	Enabled     func(*config.Config) bool
	Configured  func(*config.Config) bool
}

var catalog = []catalogEntry{
	{ID: "ipqualityscore", Name: "IPQualityScore", Implemented: true, PluginName: "ipqualityscore",
		Enabled: func(c *config.Config) bool { return c.Providers.IPQualityScore.Enabled },
		Configured: func(c *config.Config) bool { return c.Providers.IPQualityScore.APIKey != "" }},
	{ID: "abuseipdb", Name: "AbuseIPDB", Implemented: true, PluginName: "abuseipdb",
		Enabled: func(c *config.Config) bool { return c.Providers.AbuseIPDB.Enabled },
		Configured: func(c *config.Config) bool { return c.Providers.AbuseIPDB.APIKey != "" }},
	{ID: "scamalytics", Name: "Scamalytics", Implemented: false,
		Enabled: func(c *config.Config) bool { return c.Providers.Scamalytics.Enabled },
		Configured: func(c *config.Config) bool { return c.Providers.Scamalytics.APIKey != "" }},
	{ID: "bigdatacloud", Name: "BigDataCloud", Implemented: false,
		Enabled: func(c *config.Config) bool { return c.Providers.BigDataCloud.Enabled },
		Configured: func(c *config.Config) bool { return c.Providers.BigDataCloud.APIKey != "" }},
	{ID: "ipinfo", Name: "IPinfo", Implemented: false},
	{ID: "maxmind", Name: "MaxMind Anonymous IP", Implemented: false},
	{ID: "ip2location", Name: "IP2Location", Implemented: false},
}

var labelKeys = map[string]string{
	"residential": "likelyResidential",
	"vpn":         "likelyVpn",
	"hosting":     "likelyHosting",
	"mobile":      "likelyMobile",
	"corporate":   "likelyCorporate",
}

// Classify combines all provider and heuristic evidence into a consensus label.
func Classify(cfg *config.Config, rep *report.ConnectionReport, results []pipeline.ResultWrapper) report.ConnectionClassification {
	resultByPlugin := map[string]pipeline.ResultWrapper{}
	for _, res := range results {
		resultByPlugin[res.ProviderName] = res
	}

	providers := make([]report.ProviderClassificationContribution, 0, len(catalog))
	allSignals := make([]report.ClassificationSignal, 0, 32)

	for _, entry := range catalog {
		active := entry.Enabled != nil && entry.Configured != nil && entry.Enabled(cfg) && entry.Configured(cfg)
		contrib := report.ProviderClassificationContribution{
			ID:     entry.ID,
			Name:   entry.Name,
			Active: active,
		}

		if entry.Implemented && entry.PluginName != "" {
			res, ok := resultByPlugin[entry.PluginName]
			if ok && res.Success && res.Data != nil {
				if fraud, ok := res.Data.(report.FraudResult); ok && len(fraud.ClassificationSignals) > 0 {
					contrib.Queried = fraud.Queried
					contrib.Signals = fraud.ClassificationSignals
					allSignals = append(allSignals, fraud.ClassificationSignals...)
				} else if fraud, ok := res.Data.(report.FraudResult); ok && fraud.Queried {
					contrib.Queried = true
					contrib.Signals = signalsFromFraudFlags(entry.ID, fraud)
					allSignals = append(allSignals, contrib.Signals...)
				}
			}
		}

		providers = append(providers, contrib)
	}

	heuristic := heuristicSignals(rep)
	providers = append(providers, report.ProviderClassificationContribution{
		ID:      "neocheck",
		Name:    "NeoCheck heuristics",
		Active:  true,
		Queried: rep.ISP != "",
		Signals: heuristic,
	})
	allSignals = append(allSignals, heuristic...)

	category, confidence, evidence := scoreCategories(allSignals)
	labelKey := labelKeys[category]
	if labelKey == "" {
		labelKey = "likelyResidential"
	}

	queriedCount := 0
	for _, p := range providers {
		if p.Queried && len(p.Signals) > 0 {
			queriedCount++
		}
	}

	return report.ConnectionClassification{
		Category:      category,
		LabelKey:      labelKey,
		Confidence:    confidence,
		Evidence:      evidence,
		Providers:     providers,
		ProviderCount: queriedCount,
	}
}

func signalsFromFraudFlags(providerID string, fraud report.FraudResult) []report.ClassificationSignal {
	var out []report.ClassificationSignal
	add := func(key, cat string, weight int, supports bool) {
		out = append(out, report.ClassificationSignal{Key: key, Category: cat, Weight: weight, Supports: supports})
	}

	if fraud.Hosting || fraud.Datacenter {
		add("evHostingDetected", "hosting", 35, true)
	}
	if fraud.VPN {
		add("evVpnDetected", "vpn", 40, true)
	}
	if fraud.Proxy {
		add("evProxyDetected", "vpn", 28, true)
	}
	if fraud.Tor {
		add("evTorDetected", "vpn", 45, true)
	}
	if fraud.Mobile {
		add("evMobileDetected", "mobile", 38, true)
	}
	if fraud.Residential {
		add("evResidentialSignal", "residential", 30, true)
	}
	if fraud.RiskScore >= 70 {
		add("evHighFraudScore", "hosting", 18, true)
	} else if fraud.RiskScore > 0 && fraud.RiskScore < 25 {
		add("evLowFraudScore", "residential", 12, true)
	}

	_ = providerID
	return out
}

func heuristicSignals(rep *report.ConnectionReport) []report.ClassificationSignal {
	if rep.ISP == "" && rep.Organization == "" {
		return nil
	}

	isp := strings.ToLower(rep.ISP)
	org := strings.ToLower(rep.Organization)
	text := isp + " " + org

	add := func(key, cat string, weight int) report.ClassificationSignal {
		return report.ClassificationSignal{Key: key, Category: cat, Weight: weight, Supports: true}
	}

	var signals []report.ClassificationSignal

	hostingKws := []string{"hosting", "cloud", "server", "digitalocean", "linode", "vultr", "hetzner", "amazon", "google", "microsoft", "ovh", "leaseweb", "colocation", "datacenter", "data center"}
	for _, kw := range hostingKws {
		if strings.Contains(text, kw) {
			signals = append(signals, add("evHostingAsn", "hosting", 22))
			signals = append(signals, report.ClassificationSignal{Key: "evNotResidential", Category: "residential", Weight: 18, Supports: false})
			break
		}
	}

	vpnKws := []string{"nordvpn", "expressvpn", "surfshark", "proton", "mullvad", "windscribe", "vyprvpn", "private internet", "tunnelbear", "m247", "anonymous", "vpn"}
	for _, kw := range vpnKws {
		if strings.Contains(text, kw) {
			signals = append(signals, add("evVpnIspName", "vpn", 28))
			signals = append(signals, report.ClassificationSignal{Key: "evNotResidential", Category: "residential", Weight: 20, Supports: false})
			break
		}
	}

	if strings.Contains(text, "tor exit") {
		signals = append(signals, add("evTorExit", "vpn", 40))
	}

	mobileKws := []string{"t-mobile", "vodafone", "verizon", "at&t", "orange", "telekom", "cellular", "mobile", "sprint", "rogers", "bell", "telus", "mtn", "carrier"}
	for _, kw := range mobileKws {
		if strings.Contains(text, kw) {
			signals = append(signals, add("evMobileCarrier", "mobile", 24))
			break
		}
	}

	corpKws := []string{"government", "university", "college", "school", "corp", "corporate", "enterprise", "bank", "financial", "hospital", "council", "ministry", "department of"}
	for _, kw := range corpKws {
		if strings.Contains(text, kw) {
			signals = append(signals, add("evCorporateNetwork", "corporate", 26))
			break
		}
	}

	if len(signals) == 0 {
		signals = append(signals, add("evResidentialAsn", "residential", 14))
	}

	if rep.ASNType != "" {
		asnLower := strings.ToLower(rep.ASNType)
		switch {
		case strings.Contains(asnLower, "host"):
			signals = append(signals, add("evDatacenterRange", "hosting", 20))
		case strings.Contains(asnLower, "mobile"):
			signals = append(signals, add("evMobileAsn", "mobile", 18))
		case strings.Contains(asnLower, "business"), strings.Contains(asnLower, "corp"):
			signals = append(signals, add("evCorporateAsn", "corporate", 16))
		}
	}

	return signals
}

func scoreCategories(signals []report.ClassificationSignal) (category string, confidence int, evidence []report.ClassificationSignal) {
	scores := map[string]float64{
		"residential": 0,
		"vpn":         0,
		"hosting":     0,
		"mobile":      0,
		"corporate":   0,
	}

	positiveEvidence := make(map[string][]report.ClassificationSignal)

	for _, sig := range signals {
		w := float64(sig.Weight)
		if sig.Supports {
			scores[sig.Category] += w
			positiveEvidence[sig.Category] = append(positiveEvidence[sig.Category], sig)
		} else {
			scores[sig.Category] -= w * 0.6
			if scores[sig.Category] < 0 {
				scores[sig.Category] = 0
			}
		}
	}

	category = "residential"
	top := scores["residential"]
	second := 0.0

	for cat, score := range scores {
		if score > top {
			second = top
			top = score
			category = cat
			continue
		}
		if score > second {
			second = score
		}
	}

	if top <= 0 {
		confidence = 52
		evidence = positiveEvidence["residential"]
		if len(evidence) == 0 {
			evidence = []report.ClassificationSignal{{Key: "evInsufficientEvidence", Category: "residential", Weight: 1, Supports: true}}
		}
		return category, confidence, dedupeEvidence(evidence, 6)
	}

	total := 0.0
	for _, s := range scores {
		if s > 0 {
			total += s
		}
	}

	margin := top - second
	confidence = int((top / total) * 100)
	if margin > 0 {
		confidence += int((margin / top) * 12)
	}

	if confidence > 98 {
		confidence = 98
	}
	if confidence < 55 {
		confidence = 55
	}

	evidence = positiveEvidence[category]
	if len(evidence) == 0 {
		for _, sig := range signals {
			if sig.Supports {
				evidence = append(evidence, sig)
			}
		}
	}

	return category, confidence, dedupeEvidence(evidence, 8)
}

func dedupeEvidence(items []report.ClassificationSignal, limit int) []report.ClassificationSignal {
	seen := map[string]bool{}
	out := make([]report.ClassificationSignal, 0, limit)
	for _, item := range items {
		if seen[item.Key] {
			continue
		}
		seen[item.Key] = true
		out = append(out, item)
		if len(out) >= limit {
			break
		}
	}
	return out
}
