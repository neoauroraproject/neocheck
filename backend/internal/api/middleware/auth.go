package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"neocheck-backend/internal/config"
)

// JWTAuth validates the JWT token from the HttpOnly cookie
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := config.Get()

		tokenString, err := c.Cookie("neocheck_session")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, http.ErrAbortHandler
			}
			return []byte(cfg.Security.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session claims"})
			return
		}

		user, ok := claims["user"].(string)
		if !ok || user != cfg.Admin.Username {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
			return
		}

		c.Set("admin_user", user)
		c.Next()
	}
}
