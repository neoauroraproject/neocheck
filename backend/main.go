package main

import (
	"fmt"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"

	"neocheck-backend/database"
	"neocheck-backend/internal/api/admin"
	"neocheck-backend/internal/api/detection"
	"neocheck-backend/internal/api/middleware"
	"neocheck-backend/internal/config"
	"neocheck-backend/internal/engine/plugin"
	"neocheck-backend/internal/plugins/abuseipdb"
	"neocheck-backend/internal/plugins/geo"
	"neocheck-backend/internal/plugins/browser"
	"neocheck-backend/internal/plugins/security"
	"neocheck-backend/internal/plugins/ipqualityscore"
)

func main() {
	// 1. Initial basic logger for startup errors
	startupLogger, _ := zap.NewProduction()
	defer startupLogger.Sync()

	if err := config.Load(); err != nil {
		startupLogger.Fatal("Failed to load or validate configuration", zap.Error(err))
	}
	cfg := config.Get()

	// 2. Initialize persistent rotating logger
	logPath := filepath.Join(config.GetBaseDir(), "logs", "neocheck.log")
	writer := zapcore.AddSync(&lumberjack.Logger{
		Filename:   logPath,
		MaxSize:    100, // megabytes
		MaxBackups: 3,
		MaxAge:     28, // days
		Compress:   true,
	})

	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()),
		zapcore.NewMultiWriteSyncer(zapcore.AddSync(os.Stdout), writer),
		zap.InfoLevel,
	)
	logger := zap.New(core)
	defer logger.Sync()

	if err := database.InitDB(cfg, logger); err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	// 3. Register Plugins
	plugin.Register(geo.New())
	plugin.Register(abuseipdb.New())
	plugin.Register(browser.New())
	plugin.Register(security.New())
	plugin.Register(ipqualityscore.New())

	// 4. Initialize Detection Engine
	detectionHandler, err := detection.NewHandler(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize detection pipeline", zap.Error(err))
	}
	defer detectionHandler.Shutdown()

	logger.Info("Starting NeoCheck Backend", zap.String("version", "2.1.0"))

	// Initialize Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.New() // Use gin.New() to add custom middleware
	
	// Trust Docker internal networks so Next.js proxy passes the real IP via X-Forwarded-For
	_ = r.SetTrustedProxies([]string{"172.16.0.0/12", "192.168.0.0/16", "10.0.0.0/8", "127.0.0.1", "::1"})
	
	r.Use(gin.Recovery())
	r.Use(admin.ActiveRequestsMiddleware()) // Track active requests
	r.Use(middleware.SecureHeaders())       // Global security headers
	r.Use(gin.Logger())

	// Health endpoint
	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"version": "2.1.0",
			})
		})
		
		api.GET("/branding", func(c *gin.Context) {
			c.JSON(200, config.Get().Branding)
		})
		
		api.GET("/check", middleware.RateLimit(), detectionHandler.CheckIP)
	}

	// Admin API
	adminGroup := r.Group("/api/admin")
	
	// Public Admin endpoints
	authAPI := admin.NewAuthAPI(logger)
	authAPI.RegisterRoutes(adminGroup)

	// Protected Admin endpoints
	protectedAdmin := adminGroup.Group("/")
	protectedAdmin.Use(middleware.JWTAuth())
	
	configAPI := admin.NewConfigAPI(logger)
	configAPI.RegisterRoutes(protectedAdmin)

	systemAPI := admin.NewSystemAPI(logger)
	systemAPI.RegisterRoutes(protectedAdmin)

	logsAPI := admin.NewLogsAPI(logger)
	logsAPI.RegisterRoutes(protectedAdmin)

	backupsAPI := admin.NewBackupsAPI(logger)
	backupsAPI.RegisterRoutes(protectedAdmin)

	// Reverse Proxy for Next.js Frontend
	// Any route not handled by /api goes to the frontend container
	r.NoRoute(func(c *gin.Context) {
		// The Next.js frontend is on port 3000 in the docker network
		targetURL, _ := url.Parse("http://frontend:3000")
		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		
		// Let the proxy know the real IP so Next.js can have it (though Next.js doesn't need it)
		c.Request.Header.Set("X-Forwarded-For", c.ClientIP())
		
		proxy.ServeHTTP(c.Writer, c.Request)
	})

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	logger.Info("Starting server", zap.String("addr", addr))
	
	if cfg.SSL.Enabled {
		logger.Info("SSL is enabled, starting HTTPS server")
		if err := r.RunTLS(addr, cfg.SSL.CertPath, cfg.SSL.KeyPath); err != nil {
			logger.Fatal("Server failed to start in TLS mode", zap.Error(err))
		}
	} else {
		if err := r.Run(addr); err != nil {
			logger.Fatal("Server failed", zap.Error(err))
		}
	}
}
