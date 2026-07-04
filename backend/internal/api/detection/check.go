package detection

import (
	"crypto/tls"
	"net/http"

	"github.com/gin-gonic/gin"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/engine/aggregator"
	"neocheck-backend/internal/engine/pipeline"
	"neocheck-backend/internal/report"
)

type Handler struct {
	pipeline   *pipeline.Pipeline
	aggregator *aggregator.Aggregator
}

func NewHandler(cfg *config.Config) (*Handler, error) {
	pipe, err := pipeline.New(cfg)
	if err != nil {
		return nil, err
	}

	agg := aggregator.New()

	return &Handler{
		pipeline:   pipe,
		aggregator: agg,
	}, nil
}

func (h *Handler) CheckIP(c *gin.Context) {
	// 1. Extract request details
	clientIP := c.ClientIP()
	userAgent := c.Request.UserAgent()
	httpVersion := c.Request.Proto

	// Handle headers extraction securely
	headers := make(map[string]string)
	for k, v := range c.Request.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	tlsVersion := ""
	directTLSVersion := ""
	directTLSCipher := ""
	directTLSALPN := ""
	if c.Request.TLS != nil {
		switch c.Request.TLS.Version {
		case 0x0304:
			directTLSVersion = "TLS 1.3"
		case 0x0303:
			directTLSVersion = "TLS 1.2"
		case 0x0302:
			directTLSVersion = "TLS 1.1"
		case 0x0301:
			directTLSVersion = "TLS 1.0"
		}
		directTLSCipher = tls.CipherSuiteName(c.Request.TLS.CipherSuite)
		directTLSALPN = c.Request.TLS.NegotiatedProtocol
		tlsVersion = directTLSVersion
	}

	req := &report.Request{
		IP:               clientIP,
		UserAgent:        userAgent,
		Headers:          headers,
		HTTPVersion:      httpVersion,
		TLSVersion:       tlsVersion,
		DirectTLSVersion: directTLSVersion,
		DirectTLSCipher:  directTLSCipher,
		DirectTLSALPN:    directTLSALPN,
	}

	// 2. Execute the Immutable Pipeline
	// Use c.Request.Context() for global cancellation tracking
	results := h.pipeline.Execute(c.Request.Context(), req)

	// 3. Aggregate results into the final ConnectionReport
	cfg := config.Get()
	finalReport := h.aggregator.Build(req, results)
	finalReport.FraudCheckEnabled = cfg.Features.FraudCheck
	finalReport.FraudProviders = BuildFraudProviderInsights(cfg, results)

	sec := extractSecurityResult(results)
	tlsDiag := BuildTLSDiagnostics(c.Request, sec)
	ApplyTLSDiagnostics(finalReport, tlsDiag)

	// 4. Return unified JSON
	c.JSON(http.StatusOK, finalReport)
}

func (h *Handler) Shutdown() {
	h.pipeline.Shutdown()
}
