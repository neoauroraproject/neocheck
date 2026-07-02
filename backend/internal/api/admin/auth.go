package admin

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"neocheck-backend/internal/config"
)

type AuthAPI struct {
	logger *zap.Logger
}

func NewAuthAPI(logger *zap.Logger) *AuthAPI {
	return &AuthAPI{logger: logger}
}

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (a *AuthAPI) RegisterRoutes(r *gin.RouterGroup) {
	// Public routes (no JWTAuth middleware needed here)
	r.POST("/login", a.Login)
	r.POST("/logout", a.Logout)
}

func (a *AuthAPI) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
		return
	}

	cfg := config.Get()

	// Rate limiting should go here (in-memory simple logic could be added)

	if req.Username != cfg.Admin.Username {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if cfg.Admin.PasswordHash == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin password not configured"})
		return
	}

	err := bcrypt.CompareHashAndPassword([]byte(cfg.Admin.PasswordHash), []byte(req.Password))
	if err != nil {
		a.logger.Warn("Failed login attempt", zap.String("ip", c.ClientIP()))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user": req.Username,
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(cfg.Security.JWTSecret))
	if err != nil {
		a.logger.Error("Failed to sign JWT", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Set HttpOnly Cookie
	// Secure should be true in production (requires HTTPS)
	c.SetCookie("neocheck_session", tokenString, 86400, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"message": "login successful"})
}

func (a *AuthAPI) Logout(c *gin.Context) {
	// Clear the cookie by setting max age to -1
	c.SetCookie("neocheck_session", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
