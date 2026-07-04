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
	res := report.SecurityResult{
		HTTPS:         false,
		HTTPVersion:   normalizeHTTPVersion(req.HTTPVersion),
		SecureContext: true,
		Source:        "unavailable",
	}

	// Direct TLS on the incoming request (no reverse proxy).
	if req.DirectTLSVersion != "" {
		res.HTTPS = true
		res.TLSVersion = req.DirectTLSVersion
		res.CipherSuite = req.DirectTLSCipher
		res.ALPN = req.DirectTLSALPN
		res.Source = "direct"
	}

	if proto := strings.ToLower(header(req.Headers, "X-Forwarded-Proto", "X-Forwarded-Scheme")); proto == "https" {
		res.HTTPS = true
	}

	host := header(req.Headers, "Host", "host")
	if host == "" {
		return res, nil
	}

	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	if isLocalHost(host) {
		res.Source = "local"
		return res, nil
	}

	targetURL := fmt.Sprintf("https://%s/api/health", host)
	httpReq, err := http.NewRequestWithContext(ctx, "HEAD", targetURL, nil)
	if err != nil {
		return res, nil
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
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
	res.HTTPVersion = normalizeHTTPVersion(resp.Proto)
	res.Source = "outbound_probe"

	if resp.TLS != nil {
		state := *resp.TLS
		res.TLSVersion = tlsVersionName(state.Version)
		res.CipherSuite = tls.CipherSuiteName(state.CipherSuite)
		res.ALPN = state.NegotiatedProtocol
		res.OCSPStapling = len(state.OCSPResponse) > 0
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

	hstsHeader := resp.Header.Get("Strict-Transport-Security")
	res.HSTS = hstsHeader != ""
	res.HSTSHeader = hstsHeader

	res.AltSvc = resp.Header.Get("Alt-Svc")
	res.HTTP3Available = strings.Contains(strings.ToLower(res.AltSvc), "h3=")

	return res, nil
}

func header(headers map[string]string, names ...string) string {
	for _, name := range names {
		for k, v := range headers {
			if strings.EqualFold(k, name) && strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
	}
	return ""
}

func isLocalHost(host string) bool {
	return host == "localhost" || host == "127.0.0.1" || host == "::1" ||
		strings.HasPrefix(host, "192.168.") || strings.HasPrefix(host, "10.")
}

func normalizeHTTPVersion(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	switch {
	case strings.Contains(lower, "3"):
		return "HTTP/3"
	case strings.Contains(lower, "2"):
		return "HTTP/2"
	case strings.Contains(lower, "1.1"):
		return "HTTP/1.1"
	default:
		return raw
	}
}

func tlsVersionName(v uint16) string {
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
