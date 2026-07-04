package detection

import (
	"crypto/tls"
	"encoding/json"
	"net/http"
	"strings"

	"neocheck-backend/internal/engine/pipeline"
	"neocheck-backend/internal/report"
)

func headerValue(headers map[string]string, names ...string) string {
	for _, name := range names {
		for k, v := range headers {
			if strings.EqualFold(k, name) && strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
	}
	return ""
}

func detectReverseProxy(headers map[string]string) (bool, []string) {
	checks := []struct {
		header string
		label  string
	}{
		{"X-Forwarded-For", "X-Forwarded-For"},
		{"X-Forwarded-Proto", "X-Forwarded-Proto"},
		{"X-Forwarded-Host", "X-Forwarded-Host"},
		{"X-Real-IP", "X-Real-IP"},
		{"Forwarded", "Forwarded"},
		{"Via", "Via"},
		{"CF-Connecting-IP", "Cloudflare"},
		{"CF-Visitor", "CF-Visitor"},
		{"X-SSL-Protocol", "X-SSL-Protocol"},
		{"X-Forwarded-Ssl", "X-Forwarded-Ssl"},
		{"X-Forwarded-Scheme", "X-Forwarded-Scheme"},
		{"X-Original-Proto", "X-Original-Proto"},
	}

	var signals []string
	for _, c := range checks {
		if headerValue(headers, c.header) != "" {
			signals = append(signals, c.label)
		}
	}
	return len(signals) > 0, signals
}

func parseForwardedProto(forwarded string) string {
	lower := strings.ToLower(forwarded)
	for _, part := range strings.Split(lower, ";") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "proto=") {
			return strings.Trim(strings.TrimPrefix(part, "proto="), `"`)
		}
	}
	return ""
}

func parseCFVisitor(raw string) (scheme string) {
	var payload struct {
		Scheme string `json:"scheme"`
	}
	if json.Unmarshal([]byte(raw), &payload) == nil && payload.Scheme != "" {
		return strings.ToLower(payload.Scheme)
	}
	return ""
}

func clientEncrypted(headers map[string]string, directTLS *tls.ConnectionState) bool {
	if directTLS != nil {
		return true
	}

	proto := strings.ToLower(headerValue(headers, "X-Forwarded-Proto", "X-Forwarded-Scheme", "X-Original-Proto"))
	if proto == "https" {
		return true
	}

	if v := strings.ToLower(headerValue(headers, "X-Forwarded-Ssl")); v == "on" || v == "1" || v == "true" {
		return true
	}

	if fwd := headerValue(headers, "Forwarded"); fwd != "" {
		if parseForwardedProto(fwd) == "https" {
			return true
		}
	}

	if cf := parseCFVisitor(headerValue(headers, "CF-Visitor")); cf == "https" {
		return true
	}

	return false
}

func normalizeTLSVersion(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	switch {
	case strings.Contains(lower, "1.3"), strings.Contains(lower, "tlsv1.3"), strings.Contains(lower, "tls1.3"):
		return "TLS 1.3"
	case strings.Contains(lower, "1.2"), strings.Contains(lower, "tlsv1.2"), strings.Contains(lower, "tls1.2"):
		return "TLS 1.2"
	case strings.Contains(lower, "1.1"), strings.Contains(lower, "tlsv1.1"):
		return "TLS 1.1"
	case strings.Contains(lower, "1.0"), strings.Contains(lower, "tlsv1"), strings.Contains(lower, "ssl"):
		return "TLS 1.0"
	default:
		if strings.HasPrefix(strings.ToUpper(raw), "TLS") {
			return raw
		}
		return raw
	}
}

func forwardedTLSVersion(headers map[string]string) string {
	return normalizeTLSVersion(headerValue(headers, "X-SSL-Protocol", "X-TLS-Version", "X-Forwarded-Tls-Version", "SSL-Protocol"))
}

func forwardedCipher(headers map[string]string) string {
	return headerValue(headers, "X-SSL-Cipher", "X-TLS-Cipher", "X-Forwarded-Tls-Cipher", "SSL-Cipher")
}

func normalizeHTTPVersion(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	switch {
	case strings.Contains(lower, "3"), strings.Contains(lower, "h3"):
		return "HTTP/3"
	case strings.Contains(lower, "2"), strings.Contains(lower, "h2"):
		return "HTTP/2"
	case strings.Contains(lower, "1.1"):
		return "HTTP/1.1"
	case strings.Contains(lower, "1.0"):
		return "HTTP/1.0"
	default:
		return raw
	}
}

func clientHTTPVersion(headers map[string]string, backendProto string, behindProxy bool, altSvc string) string {
	if v := normalizeHTTPVersion(headerValue(headers, "X-Forwarded-Protocol", "X-Original-Protocol", "X-Http-Version")); v != "" {
		return v
	}

	if altSvc != "" && strings.Contains(strings.ToLower(altSvc), "h3=") {
		return "HTTP/3"
	}

	if !behindProxy {
		return normalizeHTTPVersion(backendProto)
	}

	if clientEncrypted(headers, nil) {
		return "HTTP/2"
	}

	return normalizeHTTPVersion(backendProto)
}

func directTLSVersion(state *tls.ConnectionState) string {
	if state == nil {
		return ""
	}
	switch state.Version {
	case tls.VersionTLS13:
		return "TLS 1.3"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS10:
		return "TLS 1.0"
	default:
		return ""
	}
}

func BuildTLSDiagnostics(httpReq *http.Request, sec *report.SecurityResult) report.TLSDiagnostics {
	headers := make(map[string]string, len(httpReq.Header))
	for k, v := range httpReq.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	behindProxy, signals := detectReverseProxy(headers)
	backendProto := normalizeHTTPVersion(httpReq.Proto)

	diag := report.TLSDiagnostics{
		BehindReverseProxy: behindProxy,
		ProxySignals:       signals,
		ExplanationKey:     "tlsExplainDirect",
	}

	if behindProxy {
		diag.ExplanationKey = "tlsExplainProxy"
	}

	altSvc := ""
	if sec != nil {
		diag.HSTS = sec.HSTS
		if sec.HSTSHeader != "" {
			diag.HSTSHeader = sec.HSTSHeader
		}
		altSvc = sec.AltSvc
		diag.HTTP3Available = sec.HTTP3Available
	}

	// --- Client layer (browser → edge) ---
	client := report.TLSLayerInfo{Role: "client"}

	if httpReq.TLS != nil && !behindProxy {
		client.Source = "direct"
		client.Encrypted = true
		client.TLSVersion = directTLSVersion(httpReq.TLS)
		client.CipherSuite = tls.CipherSuiteName(httpReq.TLS.CipherSuite)
		if httpReq.TLS.NegotiatedProtocol != "" {
			client.ALPN = httpReq.TLS.NegotiatedProtocol
		}
		client.HTTPVersion = normalizeHTTPVersion(httpReq.Proto)
	} else {
		client.Encrypted = clientEncrypted(headers, httpReq.TLS)

		if tlsVer := forwardedTLSVersion(headers); tlsVer != "" {
			client.Source = "forwarded"
			client.TLSVersion = tlsVer
			client.CipherSuite = forwardedCipher(headers)
			client.Label = "tlsForwardedInfo"
			client.Note = "tlsNoteForwarded"
		} else if client.Encrypted && behindProxy {
			client.Source = "proxy_terminated"
			client.Label = "tlsProxyHandled"
			client.Note = "tlsNoteProxyHandled"
		} else if client.Encrypted {
			client.Source = "forwarded"
			client.Label = "tlsProxyHandled"
			client.Note = "tlsNoteProxyHandled"
		} else {
			client.Source = "unavailable"
			client.Label = "tlsUnavailableBackend"
			client.Note = "tlsNoteUnavailable"
		}

		client.HTTPVersion = clientHTTPVersion(headers, backendProto, behindProxy, altSvc)
	}

	if client.HTTPVersion == "" && client.Encrypted {
		client.HTTPVersion = "HTTP/2"
	}

	diag.Client = client

	// --- Backend layer (proxy → NeoCheck) ---
	backend := report.TLSLayerInfo{
		Role:        "backend",
		HTTPVersion: backendProto,
	}

	if httpReq.TLS != nil {
		backend.Source = "direct"
		backend.Encrypted = true
		backend.TLSVersion = directTLSVersion(httpReq.TLS)
		backend.CipherSuite = tls.CipherSuiteName(httpReq.TLS.CipherSuite)
		if httpReq.TLS.NegotiatedProtocol != "" {
			backend.ALPN = httpReq.TLS.NegotiatedProtocol
		}
	} else if behindProxy {
		backend.Source = "proxy_terminated"
		backend.Encrypted = false
		backend.Label = "tlsProxyHandled"
		backend.Note = "tlsNoteBackendPlain"
	} else {
		backend.Source = "unavailable"
		backend.Encrypted = false
		backend.Label = "tlsUnavailableBackend"
		backend.Note = "tlsNoteBackendPlain"
	}

	diag.Backend = backend

	// Outbound probe enriches edge certificate / HSTS when security plugin ran.
	if sec != nil && sec.Source == "outbound_probe" {
		if diag.Client.TLSVersion == "" && sec.TLSVersion != "" {
			diag.Client.TLSVersion = sec.TLSVersion
			diag.Client.Source = "outbound_probe"
			diag.Client.Label = "tlsForwardedInfo"
			diag.Client.Note = "tlsNoteProbeEdge"
		}
		if diag.Client.CipherSuite == "" && sec.CipherSuite != "" {
			diag.Client.CipherSuite = sec.CipherSuite
		}
		if diag.Client.ALPN == "" && sec.ALPN != "" {
			diag.Client.ALPN = sec.ALPN
		}
		if !diag.Client.Encrypted && sec.HTTPS {
			diag.Client.Encrypted = true
		}
	}

	return diag
}

func ApplyTLSDiagnostics(rep *report.ConnectionReport, diag report.TLSDiagnostics) {
	rep.TLSDiagnostics = diag
	rep.HTTPS = diag.Client.Encrypted
	rep.HSTS = diag.HSTS

	if diag.Client.TLSVersion != "" {
		rep.TLSVersion = diag.Client.TLSVersion
	} else if diag.Client.Label != "" {
		rep.TLSVersion = diag.Client.Label
	}

	if diag.Client.HTTPVersion != "" {
		rep.HTTPVersion = diag.Client.HTTPVersion
	}

	if diag.Client.CipherSuite != "" {
		rep.CipherSuite = diag.Client.CipherSuite
	}

	if diag.Client.ALPN != "" {
		rep.ALPN = diag.Client.ALPN
	}

	refreshSecurityScore(rep)
}

func refreshSecurityScore(rep *report.ConnectionReport) {
	securityScore := 0
	if rep.HTTPS {
		securityScore += 20
	}
	if strings.Contains(rep.TLSVersion, "1.3") {
		securityScore += 20
	} else if strings.Contains(rep.TLSVersion, "1.2") {
		securityScore += 10
	} else if rep.TLSDiagnostics.Client.Encrypted && rep.TLSDiagnostics.BehindReverseProxy {
		// TLS terminated at proxy — still award baseline encryption credit.
		securityScore += 15
	}
	if rep.PFS {
		securityScore += 15
	}
	if rep.SecureContext {
		securityScore += 15
	}
	if rep.HSTS {
		securityScore += 15
	}
	if rep.ALPN == "h2" || rep.ALPN == "h3" || strings.Contains(rep.HTTPVersion, "2") || strings.Contains(rep.HTTPVersion, "3") {
		securityScore += 15
	}
	if securityScore > 100 {
		securityScore = 100
	}

	old := rep.ScoreBreakdown.Security
	rep.ScoreBreakdown.Security = securityScore
	rep.Score += securityScore - old
	if rep.Score > 100 {
		rep.Score = 100
	}
	if rep.Score < 0 {
		rep.Score = 0
	}
}

func extractSecurityResult(results []pipeline.ResultWrapper) *report.SecurityResult {
	for _, res := range results {
		if res.ProviderName != "security" || !res.Success || res.Data == nil {
			continue
		}
		if sec, ok := res.Data.(report.SecurityResult); ok {
			return &sec
		}
	}
	return nil
}
