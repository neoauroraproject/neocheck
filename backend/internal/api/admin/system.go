package admin

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"neocheck-backend/database"
	"neocheck-backend/internal/config"
	"neocheck-backend/internal/engine/plugin"
	"neocheck-backend/internal/report"
)

var (
	startTime      = time.Now()
	activeRequests int64
)

// ActiveRequestsMiddleware tracks the number of concurrent active requests
func ActiveRequestsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		atomic.AddInt64(&activeRequests, 1)
		defer atomic.AddInt64(&activeRequests, -1)
		c.Next()
	}
}

type SystemAPI struct {
	logger *zap.Logger
}

func NewSystemAPI(logger *zap.Logger) *SystemAPI {
	return &SystemAPI{logger: logger}
}

func (api *SystemAPI) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/status", api.GetStatus)
	router.POST("/restart", api.Restart)
	router.POST("/test-provider", api.TestProvider)
}

func (api *SystemAPI) GetStatus(c *gin.Context) {
	cfg := config.Get()

	// Memory Stats
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Uptime
	uptime := time.Since(startTime).String()

	// Enabled Providers
	enabledProviders := []string{}
	if cfg.Providers.AbuseIPDB.Enabled {
		enabledProviders = append(enabledProviders, "abuseipdb")
	}
	if cfg.Providers.BigDataCloud.Enabled {
		enabledProviders = append(enabledProviders, "bigdatacloud")
	}
	if cfg.Providers.IPQualityScore.Enabled {
		enabledProviders = append(enabledProviders, "ipqualityscore")
	}
	if cfg.Providers.Scamalytics.Enabled {
		enabledProviders = append(enabledProviders, "scamalytics")
	}

	// Database Status
	dbStatus := "Connected"
	if database.DB == nil {
		dbStatus = "Disconnected"
	} else {
		sqlDB, err := database.DB.DB()
		if err != nil || sqlDB.Ping() != nil {
			dbStatus = "Error"
		}
	}

	// SSL Status
	sslStatus := "Disabled"
	if cfg.SSL.Enabled {
		sslStatus = "Enabled"
	}

	c.JSON(http.StatusOK, gin.H{
		"version":              "1.0.0",
		"uptime":               uptime,
		"memory_allocated_mb":  fmt.Sprintf("%.2f MB", float64(m.Alloc)/1024/1024),
		"cpu_cores":            runtime.NumCPU(),
		"docker_status":        "Running", // App is running in docker, so status is running
		"active_requests":      atomic.LoadInt64(&activeRequests),
		"enabled_providers":    enabledProviders,
		"configuration_status": "Valid",
		"ssl_status":           sslStatus,
		"database_status":      dbStatus,
	})
}

func (api *SystemAPI) Restart(c *gin.Context) {
	user, _ := c.Get("admin_user")
	api.logger.Info("Graceful restart requested by admin", zap.String("user", user.(string)))

	c.JSON(http.StatusOK, gin.H{"message": "application is restarting..."})

	// Wait 1 second and exit. Docker will restart the container because of restart: unless-stopped
	go func() {
		time.Sleep(1 * time.Second)
		os.Exit(0)
	}()
}

type testProviderRequest struct {
	ProviderName string `json:"provider" binding:"required"`
	APIKey       string `json:"api_key" binding:"required"`
}

func (api *SystemAPI) TestProvider(c *gin.Context) {
	var req testProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Find the provider in the registry
	var targetProvider plugin.Provider
	for _, p := range plugin.GetProviders() {
		if p.Name() == req.ProviderName {
			targetProvider = p
			break
		}
	}

	if targetProvider == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("provider %s not found", req.ProviderName)})
		return
	}

	// Temporarily create a clone of current config with the test key to test the check method
	testCfg := *config.Get()
	switch req.ProviderName {
	case "abuseipdb":
		testCfg.Providers.AbuseIPDB.APIKey = req.APIKey
	case "bigdatacloud":
		testCfg.Providers.BigDataCloud.APIKey = req.APIKey
	case "ipqualityscore":
		testCfg.Providers.IPQualityScore.APIKey = req.APIKey
	case "scamalytics":
		testCfg.Providers.Scamalytics.APIKey = req.APIKey
	}

	if err := targetProvider.Initialize(&testCfg); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   fmt.Sprintf("initialization failed: %v", err),
		})
		return
	}
	defer func() {
		_ = targetProvider.Initialize(config.Get())
	}()

	// Test perform check against a well-known public IP
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	testReq := &report.Request{
		IP: "8.8.8.8",
	}

	_, err := targetProvider.Check(ctx, testReq)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "connection test succeeded",
	})
}
