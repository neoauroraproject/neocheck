package main

import (
	"fmt"
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

	// 4. Initialize Detection Engine
	detectionHandler, err := detection.NewHandler(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize detection pipeline", zap.Error(err))
	}
	defer detectionHandler.Shutdown()

	logger.Info("Starting NeoCheck Backend", zap.String("version", "1.0.0"))

	// Initialize Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.New() // Use gin.New() to add custom middleware
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
				"version": "1.0.0",
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

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	logger.Info("Starting server", zap.String("addr", addr))
	if err := r.Run(addr); err != nil {
		logger.Fatal("Server failed", zap.Error(err))
	}
}
