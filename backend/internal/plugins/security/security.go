package security

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

type SecurityProvider struct {
	client *http.Client
}

func New() *SecurityProvider {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		DialContext: (&net.Dialer{
			Timeout: 1500 * time.Millisecond,
		}).DialContext,
	}
	return &SecurityProvider{
		client: &http.Client{
			Transport: tr,
			Timeout:   2000 * time.Millisecond,
		},
	}
}

func (p *SecurityProvider) Name() string {
	return "security"
}

func (p *SecurityProvider) Initialize(cfg *config.Config) error {
	return nil
}

func (p *SecurityProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	// Default result for offline or non-TLS environments
	res := report.SecurityResult{
		HTTPS:          false,
		HTTPVersion:    req.HTTPVersion,
		TLSVersion:     "None",
		CipherSuite:    "None",
		ALPN:           "None",
		HSTS:           false,
		OCSPStapling:   false,
		CertIssuer:     "None",
		CertExpiration: "None",
		PFS:            false,
		SecureContext:  true, // Handled client-side, default true
	}

	host := req.Headers["Host"]
	if host == "" {
		host = req.Headers["host"]
	}
	if host == "" {
		return res, nil
	}

	// Strip port if present
	if strings.Contains(host, ":") {
		h, _, err := net.SplitHostPort(host)
		if err == nil {
			host = h
		}
	}

	// If running locally, don't perform external TLS check
	if host == "localhost" || host == "127.0.0.1" || strings.HasPrefix(host, "192.168.") || strings.HasPrefix(host, "10.") || host == "::1" {
		return res, nil
	}

	// Make a quick HEAD request to the public endpoint to inspect headers and TLS state
	targetURL := fmt.Sprintf("https://%s/api/health", host)
	httpReq, err := http.NewRequestWithContext(ctx, "HEAD", targetURL, nil)
	if err != nil {
		return res, nil
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		// Fallback try without /api/health (root)
		targetURL = fmt.Sprintf("https://%s/", host)
		httpReq, err = http.NewRequestWithContext(ctx, "HEAD", targetURL, nil)
		if err != nil {
			return res, nil
		}
		resp, err = p.client.Do(httpReq)
		if err != nil {
			return res, nil
		}
	}
	defer resp.Body.Close()

	res.HTTPS = true
	res.HTTPVersion = resp.Proto

	if resp.TLS != nil {
		state := *resp.TLS
		res.TLSVersion = getTLSVersionName(state.Version)
		res.CipherSuite = tls.CipherSuiteName(state.CipherSuite)
		res.ALPN = state.NegotiatedProtocol
		if res.ALPN == "" {
			res.ALPN = "None"
		}
		res.OCSPStapling = len(state.OCSPResponse) > 0
		
		// Check PFS
		res.PFS = isCipherPFS(state.CipherSuite) || state.Version == tls.VersionTLS13

		if len(state.PeerCertificates) > 0 {
			cert := state.PeerCertificates[0]
			res.CertIssuer = cert.Issuer.CommonName
			if res.CertIssuer == "" && len(cert.Issuer.Organization) > 0 {
				res.CertIssuer = cert.Issuer.Organization[0]
			}
			res.CertExpiration = cert.NotAfter.Format("2006-01-02")
		}
	}

	// Check HSTS
	hstsHeader := resp.Header.Get("Strict-Transport-Security")
	res.HSTS = hstsHeader != ""

	return res, nil
}

func getTLSVersionName(v uint16) string {
	switch v {
	case tls.VersionTLS10:
		return "TLS 1.0"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS13:
		return "TLS 1.3"
	default:
		return fmt.Sprintf("Unknown (0x%04X)", v)
	}
}

func isCipherPFS(suite uint16) bool {
	name := tls.CipherSuiteName(suite)
	return strings.Contains(name, "_ECDHE_") || strings.Contains(name, "_DHE_")
}

func (p *SecurityProvider) Shutdown() error {
	return nil
}
