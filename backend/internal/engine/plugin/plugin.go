package plugin

import (
	"context"
	"sync"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

// Provider represents the standard interface that all detection plugins must implement.
// A provider is entirely isolated and only communicates via the strongly-typed report models.
type Provider interface {
	// Name returns the unique identifier for the provider (e.g. "abuseipdb").
	Name() string

	// Initialize prepares the provider, usually by reading API keys from config.
	Initialize(cfg *config.Config) error

	// Check executes the provider's logic. It takes a context for timeout/cancellation
	// and returns an arbitrary result structure which the Aggregator will type-assert.
	Check(ctx context.Context, req *report.Request) (any, error)

	// Shutdown performs any necessary cleanup.
	Shutdown() error
}

var (
	registryMutex sync.RWMutex
	providers     = make(map[string]Provider)
)

// Register adds a new provider to the global registry.
func Register(p Provider) {
	registryMutex.Lock()
	defer registryMutex.Unlock()
	providers[p.Name()] = p
}

// GetProviders returns a slice of all registered providers.
func GetProviders() []Provider {
	registryMutex.RLock()
	defer registryMutex.RUnlock()
	
	list := make([]Provider, 0, len(providers))
	for _, p := range providers {
		list = append(list, p)
	}
	return list
}
