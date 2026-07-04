package admin

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"neocheck-backend/internal/config"
)

type ConfigAPI struct {
	logger *zap.Logger
}

func NewConfigAPI(logger *zap.Logger) *ConfigAPI {
	return &ConfigAPI{
		logger: logger,
	}
}

func (api *ConfigAPI) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/settings", api.GetConfig)
	router.PUT("/settings", api.UpdateConfig)
	router.POST("/reload", api.ReloadConfig)
}

func (api *ConfigAPI) GetConfig(c *gin.Context) {
	cfg := config.Get()

	// Mask sensitive values before returning
	maskedCfg := *cfg
	maskedCfg.Admin.PasswordHash = "---"
	maskedCfg.Security.JWTSecret = "---"
	maskedCfg.Security.SessionSecret = "---"

	if maskedCfg.Providers.AbuseIPDB.APIKey != "" {
		maskedCfg.Providers.AbuseIPDB.APIKey = "---"
	}
	if maskedCfg.Providers.BigDataCloud.APIKey != "" {
		maskedCfg.Providers.BigDataCloud.APIKey = "---"
	}
	if maskedCfg.Providers.IPQualityScore.APIKey != "" {
		maskedCfg.Providers.IPQualityScore.APIKey = "---"
	}
	if maskedCfg.Providers.Scamalytics.APIKey != "" {
		maskedCfg.Providers.Scamalytics.APIKey = "---"
	}

	c.JSON(http.StatusOK, maskedCfg)
}

func (api *ConfigAPI) UpdateConfig(c *gin.Context) {
	var payload config.Config
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON payload"})
		return
	}

	// Because the payload might have "---" for masked values, we must retain the existing secrets
	// for any field that is exactly "---".
	existingCfg := config.Get()
	if payload.Admin.PasswordHash == "---" || payload.Admin.PasswordHash == "" {
		payload.Admin.PasswordHash = existingCfg.Admin.PasswordHash
	}
	if payload.Security.JWTSecret == "---" || payload.Security.JWTSecret == "" {
		payload.Security.JWTSecret = existingCfg.Security.JWTSecret
	}
	if payload.Security.SessionSecret == "---" || payload.Security.SessionSecret == "" {
		payload.Security.SessionSecret = existingCfg.Security.SessionSecret
	}
	if payload.Providers.AbuseIPDB.APIKey == "---" {
		payload.Providers.AbuseIPDB.APIKey = existingCfg.Providers.AbuseIPDB.APIKey
	}
	if payload.Providers.BigDataCloud.APIKey == "---" {
		payload.Providers.BigDataCloud.APIKey = existingCfg.Providers.BigDataCloud.APIKey
	}
	if payload.Providers.IPQualityScore.APIKey == "---" {
		payload.Providers.IPQualityScore.APIKey = existingCfg.Providers.IPQualityScore.APIKey
	}
	if payload.Providers.Scamalytics.APIKey == "---" {
		payload.Providers.Scamalytics.APIKey = existingCfg.Providers.Scamalytics.APIKey
	}
	if payload.SSL.CertPath == "" {
		payload.SSL.CertPath = existingCfg.SSL.CertPath
	}
	if payload.SSL.KeyPath == "" {
		payload.SSL.KeyPath = existingCfg.SSL.KeyPath
	}
	if payload.SSL.Enabled {
		if _, err := config.NormalizeSSLConfig(&payload); err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
	}

	if err := config.Update(&payload); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	if err := config.Save(); err != nil {
		api.logger.Error("Failed to save configuration", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save configuration"})
		return
	}

	user, _ := c.Get("admin_user")
	api.logger.Info("Configuration updated",
		zap.String("username", user.(string)),
		zap.Time("timestamp", time.Now()),
		zap.String("action", "update_config"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "configuration updated successfully"})
}

func (api *ConfigAPI) ReloadConfig(c *gin.Context) {
	if err := config.Reload(); err != nil {
		api.logger.Error("Failed to reload configuration", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user, _ := c.Get("admin_user")
	api.logger.Info("Configuration reloaded",
		zap.String("username", user.(string)),
		zap.Time("timestamp", time.Now()),
		zap.String("action", "reload_config"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "configuration reloaded successfully"})
}
