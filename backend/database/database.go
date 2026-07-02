package database

import (
	"fmt"
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"neocheck-backend/internal/config"
)

var DB *gorm.DB

func InitDB(cfg *config.Config, logger *zap.Logger) error {
	// Ensure directory exists
	dir := filepath.Dir(cfg.Database.Path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := gorm.Open(sqlite.Open(cfg.Database.Path), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	DB = db
	logger.Info("Database connection established", zap.String("path", cfg.Database.Path))

	// Auto-migrate models here
	// err = db.AutoMigrate(&models.YourModel{})
	
	return nil
}
