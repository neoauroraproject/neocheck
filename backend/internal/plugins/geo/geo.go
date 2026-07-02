package geo

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

type GeoProvider struct {
	client *http.Client
}

func New() *GeoProvider {
	return &GeoProvider{
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (p *GeoProvider) Name() string {
	return "geo"
}

func (p *GeoProvider) Initialize(cfg *config.Config) error {
	return nil
}

type ipApiResponse struct {
	Query       string  `json:"query"`
	Status      string  `json:"status"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	RegionName  string  `json:"regionName"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Timezone    string  `json:"timezone"`
	Isp         string  `json:"isp"`
	Org         string  `json:"org"`
	As          string  `json:"as"`
}

func (p *GeoProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	url := "http://ip-api.com/json/"
	
	// If checking locally, let the API determine our current public testing IP
	isLocal := req.IP == "127.0.0.1" || req.IP == "::1" || req.IP == "" ||
		(len(req.IP) >= 3 && req.IP[:3] == "10.") ||
		(len(req.IP) >= 8 && req.IP[:8] == "192.168.")

	if !isLocal {
		url = fmt.Sprintf("http://ip-api.com/json/%s", req.IP)
	}

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
		return nil, fmt.Errorf("ip-api returned status %d", resp.StatusCode)
	}

	var data ipApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	if data.Status != "success" {
		// Fallback mock if external API queries fail
		return report.GeoResult{
			Country:     "Local Loopback",
			CountryCode: "US",
			CountryFlag: "US",
			Region:      "Localhost",
			City:        "Local Diagnostics",
			Latitude:    0.0,
			Longitude:   0.0,
			Timezone:    "UTC",
			ISP:         "Local Server Loopback Connection",
			ASN:         0,
			Org:         "Local Loopback",
		}, nil
	}

	asnInt := 0
	if data.As != "" {
		fmt.Sscanf(data.As, "AS%d", &asnInt)
	}

	return report.GeoResult{
		Country:     data.Country,
		CountryCode: data.CountryCode,
		CountryFlag: data.CountryCode, // String country code for frontend flagcdn image resolution
		Region:      data.RegionName,
		City:        data.City,
		Latitude:    data.Lat,
		Longitude:   data.Lon,
		Timezone:    data.Timezone,
		ISP:         data.Isp,
		ASN:         asnInt,
		Org:         data.Org,
	}, nil
}

func (p *GeoProvider) Shutdown() error {
	return nil
}
