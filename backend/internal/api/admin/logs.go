package admin

import (
	"bufio"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"neocheck-backend/internal/config"
)

type LogsAPI struct {
	logger *zap.Logger
}

func NewLogsAPI(logger *zap.Logger) *LogsAPI {
	return &LogsAPI{logger: logger}
}

func (api *LogsAPI) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/logs", api.GetLogs)
	router.DELETE("/logs", api.ClearLogs)
	router.GET("/logs/download", api.DownloadLogs)
}

func getLogFilePath() string {
	return filepath.Join(config.GetBaseDir(), "logs", "neocheck.log")
}

func (api *LogsAPI) GetLogs(c *gin.Context) {
	logPath := getLogFilePath()
	filter := c.Query("filter") // e.g. "ERROR", "warn", or specific keywords

	file, err := os.Open(logPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to open log file"})
		return
	}
	defer file.Close()

	var logs []string
	scanner := bufio.NewScanner(file)
	
	// Read last 200 lines by default or filter
	for scanner.Scan() {
		line := scanner.Text()
		if filter != "" {
			if strings.Contains(strings.ToLower(line), strings.ToLower(filter)) {
				logs = append(logs, line)
			}
		} else {
			logs = append(logs, line)
		}
	}

	if err := scanner.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading log file"})
		return
	}

	// Limit to last 500 lines to avoid blowing up response size
	if len(logs) > 500 {
		logs = logs[len(logs)-500:]
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

func (api *LogsAPI) ClearLogs(c *gin.Context) {
	logPath := getLogFilePath()
	
	// Truncate the file to 0 size
	err := os.WriteFile(logPath, []byte(""), 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to clear log file"})
		return
	}

	user, _ := c.Get("admin_user")
	api.logger.Info("Logs cleared by admin", zap.String("user", user.(string)))

	c.JSON(http.StatusOK, gin.H{"message": "logs cleared successfully"})
}

func (api *LogsAPI) DownloadLogs(c *gin.Context) {
	logPath := getLogFilePath()
	
	file, err := os.Open(logPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "log file not found"})
		return
	}
	defer file.Close()

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", "attachment; filename=neocheck.log")
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Expires", "0")
	c.Header("Cache-Control", "must-revalidate")
	c.Header("Pragma", "public")

	_, err = io.Copy(c.Writer, file)
	if err != nil {
		api.logger.Error("Failed to write log file to response stream", zap.Error(err))
	}
}
