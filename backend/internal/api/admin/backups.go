package admin

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"neocheck-backend/internal/config"
)

type BackupsAPI struct {
	logger *zap.Logger
}

func NewBackupsAPI(logger *zap.Logger) *BackupsAPI {
	return &BackupsAPI{logger: logger}
}

func (api *BackupsAPI) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/backups", api.ListBackups)
	router.POST("/backups", api.CreateBackup)
	router.GET("/backups/download", api.DownloadBackup)
	router.POST("/backups/restore", api.RestoreBackup)
	router.DELETE("/backups", api.DeleteBackup)
}

func getBackupDir() string {
	return filepath.Join(config.GetBaseDir(), "backups")
}

func getDatabasePath() string {
	return filepath.Join(config.GetBaseDir(), "database", "neocheck.db")
}

func (api *BackupsAPI) ListBackups(c *gin.Context) {
	backupDir := getBackupDir()
	files, err := os.ReadDir(backupDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to read backups directory"})
		return
	}

	var backups []gin.H
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".db") {
			info, err := f.Info()
			if err == nil {
				backups = append(backups, gin.H{
					"name": f.Name(),
					"size": info.Size(),
					"time": info.ModTime(),
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"backups": backups})
}

func (api *BackupsAPI) CreateBackup(c *gin.Context) {
	dbPath := getDatabasePath()
	backupDir := getBackupDir()

	timestamp := time.Now().Format("20060102_150405")
	backupPath := filepath.Join(backupDir, fmt.Sprintf("neocheck_%s.db", timestamp))

	// Simple copy of SQLite file
	source, err := os.Open(dbPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to open database file"})
		return
	}
	defer source.Close()

	dest, err := os.Create(backupPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to create backup file"})
		return
	}
	defer dest.Close()

	_, err = io.Copy(dest, source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "backup copy failed"})
		return
	}

	user, _ := c.Get("admin_user")
	api.logger.Info("Backup created", zap.String("user", user.(string)), zap.String("path", backupPath))

	c.JSON(http.StatusOK, gin.H{"message": "backup created successfully", "filename": filepath.Base(backupPath)})
}

func (api *BackupsAPI) DownloadBackup(c *gin.Context) {
	filename := c.Query("filename")
	if filename == "" || strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid filename"})
		return
	}

	backupPath := filepath.Join(getBackupDir(), filename)
	if _, err := os.Stat(backupPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "backup file not found"})
		return
	}

	c.File(backupPath)
}

func (api *BackupsAPI) RestoreBackup(c *gin.Context) {
	var req struct {
		Filename string `json:"filename" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if strings.Contains(req.Filename, "..") || strings.Contains(req.Filename, "/") || strings.Contains(req.Filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid filename"})
		return
	}

	backupPath := filepath.Join(getBackupDir(), req.Filename)
	if _, err := os.Stat(backupPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "backup file not found"})
		return
	}

	dbPath := getDatabasePath()

	// In SQLite, copy over. Since DB might be locked, this is a basic copy.
	// In production, we might want to shut down DB pool first, but copying over works for standard setups.
	source, err := os.Open(backupPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to open backup file"})
		return
	}
	defer source.Close()

	dest, err := os.OpenFile(dbPath, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to open database file for restore"})
		return
	}
	defer dest.Close()

	_, err = io.Copy(dest, source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "restore failed"})
		return
	}

	user, _ := c.Get("admin_user")
	api.logger.Info("Backup restored", zap.String("user", user.(string)), zap.String("filename", req.Filename))

	c.JSON(http.StatusOK, gin.H{"message": "backup restored successfully. Please restart application to ensure DB consistency."})
}

func (api *BackupsAPI) DeleteBackup(c *gin.Context) {
	filename := c.Query("filename")
	if filename == "" || strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid filename"})
		return
	}

	backupPath := filepath.Join(getBackupDir(), filename)
	if err := os.Remove(backupPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete backup"})
		return
	}

	user, _ := c.Get("admin_user")
	api.logger.Info("Backup deleted", zap.String("user", user.(string)), zap.String("filename", filename))

	c.JSON(http.StatusOK, gin.H{"message": "backup deleted successfully"})
}
