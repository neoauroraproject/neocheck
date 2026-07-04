package pipeline

import (
	"context"
	"sync"
	"time"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/engine/plugin"
	"neocheck-backend/internal/report"
)

// ResultWrapper encapsulates a plugin's raw result along with execution metadata.
type ResultWrapper struct {
	ProviderName string
	Data         any
	Error        error
	Duration     time.Duration
	Success      bool
}

// Pipeline orchestrates the execution of multiple plugins.
type Pipeline struct {
	providers []plugin.Provider
	timeout   time.Duration
}

// New creates a new execution pipeline using the globally registered providers.
func New(cfg *config.Config) (*Pipeline, error) {
	// 5 seconds default timeout per provider to ensure fast page loads
	p := &Pipeline{
		providers: plugin.GetProviders(),
		timeout:   5 * time.Second,
	}

	// Initialize all providers
	for _, prov := range p.providers {
		if err := prov.Initialize(cfg); err != nil {
			// A failing provider initialization shouldn't crash the whole pipeline,
			// but for now, we return the error to fail fast on startup.
			// Depending on strictness, we could log and continue.
			return nil, err
		}
	}

	return p, nil
}

func (p *Pipeline) syncProviders() {
	cfg := config.Get()
	for _, prov := range p.providers {
		_ = prov.Initialize(cfg)
	}
}

// Execute runs all initialized providers concurrently against the given Request.
func (p *Pipeline) Execute(ctx context.Context, req *report.Request) []ResultWrapper {
	p.syncProviders()

	var wg sync.WaitGroup
	results := make([]ResultWrapper, len(p.providers))

	for i, prov := range p.providers {
		wg.Add(1)
		go func(index int, provider plugin.Provider) {
			defer wg.Done()
			
			// Create a timeout context specific to this provider
			provCtx, cancel := context.WithTimeout(ctx, p.timeout)
			defer cancel()

			start := time.Now()
			data, err := provider.Check(provCtx, req)
			duration := time.Since(start)

			results[index] = ResultWrapper{
				ProviderName: provider.Name(),
				Data:         data,
				Error:        err,
				Duration:     duration,
				Success:      err == nil,
			}
		}(i, prov)
	}

	wg.Wait()
	return results
}

// Shutdown gracefully shuts down all providers in the pipeline.
func (p *Pipeline) Shutdown() {
	for _, prov := range p.providers {
		prov.Shutdown()
	}
}
