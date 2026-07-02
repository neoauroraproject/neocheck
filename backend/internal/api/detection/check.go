package detection

import (
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
	if c.Request.TLS != nil {
		tlsVersion = "TLS" // We can parse version from c.Request.TLS.Version
	}

	req := &report.Request{
		IP:          clientIP,
		UserAgent:   userAgent,
		Headers:     headers,
		HTTPVersion: httpVersion,
		TLSVersion:  tlsVersion,
	}

	// 2. Execute the Immutable Pipeline
	// Use c.Request.Context() for global cancellation tracking
	results := h.pipeline.Execute(c.Request.Context(), req)

	// 3. Aggregate results into the final ConnectionReport
	finalReport := h.aggregator.Build(req, results)

	// 4. Return unified JSON
	c.JSON(http.StatusOK, finalReport)
}

func (h *Handler) Shutdown() {
	h.pipeline.Shutdown()
}
