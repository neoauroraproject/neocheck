package config

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/spf13/viper"
)

var (
	cfgMutex sync.RWMutex
	current  *Config
)

type Config struct {
	Server    ServerConfig    `mapstructure:"server" json:"server"`
	Branding  BrandingConfig  `mapstructure:"branding" json:"branding"`
	SSL       SSLConfig       `mapstructure:"ssl" json:"ssl"`
	Admin     AdminConfig     `mapstructure:"admin" json:"admin"`
	Security  SecurityConfig  `mapstructure:"security" json:"security"`
	Providers ProvidersConfig `mapstructure:"providers" json:"providers"`
	Features  FeaturesConfig  `mapstructure:"features" json:"features"`
	Database  DatabaseConfig  `mapstructure:"database" json:"database"` // Legacy mapping for db
}

type ServerConfig struct {
	Host string `mapstructure:"host" json:"host"`
	Port int    `mapstructure:"port" json:"port"`
}

type BrandingConfig struct {
	Name             string `mapstructure:"name" json:"name"`
	Subtitle         string `mapstructure:"subtitle" json:"subtitle"`
	Logo             string `mapstructure:"logo" json:"logo"`
	Favicon          string `mapstructure:"favicon" json:"favicon"`
	PrimaryColor     string `mapstructure:"primary_color" json:"primary_color"`
	AccentColor      string `mapstructure:"accent_color" json:"accent_color"`
	FooterText       string `mapstructure:"footer_text" json:"footer_text"`
	CopyrightText    string `mapstructure:"copyright_text" json:"copyright_text"`
	SupportURL       string `mapstructure:"support_url" json:"support_url"`
	GithubURL        string `mapstructure:"github_url" json:"github_url"`
	DocumentationURL string `mapstructure:"documentation_url" json:"documentation_url"`
	PublicURL        string `mapstructure:"public_url" json:"public_url"`
}

type SSLConfig struct {
	Enabled  bool   `mapstructure:"enabled" json:"enabled"`
	CertPath string `mapstructure:"cert_path" json:"cert_path"`
	KeyPath  string `mapstructure:"key_path" json:"key_path"`
}

type AdminConfig struct {
	Username     string `mapstructure:"username" json:"username"`
	PasswordHash string `mapstructure:"password_hash" json:"password_hash"`
}

type SecurityConfig struct {
	SessionSecret string `mapstructure:"session_secret" json:"session_secret"`
	JWTSecret     string `mapstructure:"jwt_secret" json:"jwt_secret"`
}

type ProvidersConfig struct {
	AbuseIPDB      ProviderDetails `mapstructure:"abuseipdb" json:"abuseipdb"`
	BigDataCloud   ProviderDetails `mapstructure:"bigdatacloud" json:"bigdatacloud"`
	IPQualityScore ProviderDetails `mapstructure:"ipqualityscore" json:"ipqualityscore"`
	Scamalytics    ProviderDetails `mapstructure:"scamalytics" json:"scamalytics"`
}

type ProviderDetails struct {
	Enabled bool   `mapstructure:"enabled" json:"enabled"`
	APIKey  string `mapstructure:"api_key" json:"api_key"`
}

type FeaturesConfig struct {
	IPv6         bool `mapstructure:"ipv6" json:"ipv6"`
	WebRTC       bool `mapstructure:"webrtc" json:"webrtc"`
	DNSLeak      bool `mapstructure:"dns_leak" json:"dns_leak"`
	ServiceCheck bool `mapstructure:"service_check" json:"service_check"`
	FraudCheck   bool `mapstructure:"fraud_check" json:"fraud_check"`
}

type DatabaseConfig struct {
	Path string `mapstructure:"path" json:"path"`
}

func initViper() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	
	viper.SetEnvPrefix("NEOCHECK")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	baseDir := GetBaseDir()
	viper.AddConfigPath(filepath.Join(baseDir, "config"))
	viper.AddConfigPath("config")
	viper.AddConfigPath(".")
}

func GetBaseDir() string {
	if dir := os.Getenv("NEOCHECK_DATA_DIR"); dir != "" {
		return dir
	}
	return "/opt/neocheck"
}

func verifyPersistentDirectories() error {
	baseDir := GetBaseDir()
	dirs := []string{
		filepath.Join(baseDir, "config"),
		filepath.Join(baseDir, "database"),
		filepath.Join(baseDir, "logs"),
		filepath.Join(baseDir, "ssl"),
		filepath.Join(baseDir, "backups"),
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d, 0755); err != nil {
			return fmt.Errorf("failed to create persistent directory %s: %w", d, err)
		}
	}
	return nil
}

func Load() error {
	initViper()

	if err := verifyPersistentDirectories(); err != nil {
		return err
	}

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			if err := generateDefaults(); err != nil {
				return fmt.Errorf("failed to generate default config: %w", err)
			}
			if err := viper.ReadInConfig(); err != nil {
				return fmt.Errorf("failed to read newly generated config: %w", err)
			}
		} else {
			return fmt.Errorf("failed to read config file: %w", err)
		}
	} else {
		if err := ensureSecureDefaults(); err != nil {
			return err
		}
	}

	var loadedConfig Config
	if err := viper.Unmarshal(&loadedConfig); err != nil {
		return fmt.Errorf("failed to unmarshal config: %w", err)
	}

	if repaired, err := NormalizeSSLConfig(&loadedConfig); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	} else if repaired {
		cfgMutex.Lock()
		current = &loadedConfig
		cfgMutex.Unlock()
		if err := Save(); err != nil {
			return fmt.Errorf("failed to persist repaired ssl configuration: %w", err)
		}
	}

	if err := validate(&loadedConfig); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	cfgMutex.Lock()
	current = &loadedConfig
	cfgMutex.Unlock()

	return nil
}

func Get() *Config {
	cfgMutex.RLock()
	defer cfgMutex.RUnlock()
	
	cp := *current
	return &cp
}

func Update(newConfig *Config) error {
	if err := validate(newConfig); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	cfgMutex.Lock()
	current = newConfig
	cfgMutex.Unlock()

	return nil
}

func Save() error {
	cfgMutex.RLock()
	defer cfgMutex.RUnlock()

	if current == nil {
		return errors.New("no configuration loaded to save")
	}

	viper.Set("server", current.Server)
	viper.Set("branding", current.Branding)
	viper.Set("ssl", current.SSL)
	viper.Set("admin", current.Admin)
	viper.Set("security", current.Security)
	viper.Set("providers", current.Providers)
	viper.Set("features", current.Features)
	viper.Set("database", current.Database)

	return viper.WriteConfig()
}

func Reload() error {
	return Load()
}

func validate(cfg *Config) error {
	if cfg.Server.Port < 1 || cfg.Server.Port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535, got %d", cfg.Server.Port)
	}
	if cfg.Branding.Name == "" {
		return errors.New("branding name cannot be empty")
	}
	if cfg.Admin.Username == "" {
		return errors.New("admin username cannot be empty")
	}
	if cfg.SSL.Enabled {
		if cfg.SSL.CertPath == "" || cfg.SSL.KeyPath == "" {
			return errors.New("ssl is enabled but cert_path or key_path is empty")
		}
		if _, err := os.Stat(cfg.SSL.CertPath); os.IsNotExist(err) {
			return fmt.Errorf("ssl cert file does not exist: %s", cfg.SSL.CertPath)
		}
		if _, err := os.Stat(cfg.SSL.KeyPath); os.IsNotExist(err) {
			return fmt.Errorf("ssl key file does not exist: %s", cfg.SSL.KeyPath)
		}
	}
	return nil
}

func NormalizeSSLConfig(cfg *Config) (repaired bool, err error) {
	if !cfg.SSL.Enabled {
		return false, nil
	}

	baseDir := GetBaseDir()
	if cfg.SSL.CertPath == "" {
		cfg.SSL.CertPath = filepath.Join(baseDir, "ssl", "server.crt")
		repaired = true
	}
	if cfg.SSL.KeyPath == "" {
		cfg.SSL.KeyPath = filepath.Join(baseDir, "ssl", "server.key")
		repaired = true
	}

	certOK := fileExists(cfg.SSL.CertPath)
	keyOK := fileExists(cfg.SSL.KeyPath)
	if certOK && keyOK {
		return repaired, nil
	}

	cfg.SSL.Enabled = false
	repaired = true
	return repaired, nil
}

func fileExists(path string) bool {
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

func generateDefaults() error {
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.port", 8080)
	
	viper.SetDefault("branding.name", "NeoCheck")
	viper.SetDefault("branding.subtitle", "Know your connection in seconds.")
	viper.SetDefault("branding.logo", "")
	viper.SetDefault("branding.favicon", "")
	viper.SetDefault("branding.primary_color", "#8b5cf6")
	viper.SetDefault("branding.accent_color", "#6366f1")
	viper.SetDefault("branding.footer_text", "Managed by Immutable Diagnostics.")
	viper.SetDefault("branding.copyright_text", "NeoCheck")
	viper.SetDefault("branding.support_url", "https://github.com/neoauroraproject/neocheck/issues")
	viper.SetDefault("branding.github_url", "https://github.com/neoauroraproject/neocheck")
	viper.SetDefault("branding.documentation_url", "https://github.com/neoauroraproject/neocheck/tree/main/docs")
	viper.SetDefault("branding.public_url", "http://localhost:3000")

	viper.SetDefault("ssl.enabled", false)
	viper.SetDefault("ssl.cert_path", "")
	viper.SetDefault("ssl.key_path", "")

	viper.SetDefault("admin.username", "admin")
	viper.SetDefault("admin.password_hash", "$2y$05$MkXu.7CaYfOHgrfCfLhwEO3TSkjU.qFYvfwf3nV00b1kcFatsPEyG")

	viper.SetDefault("providers.abuseipdb.enabled", false)
	viper.SetDefault("providers.abuseipdb.api_key", "")
	viper.SetDefault("providers.bigdatacloud.enabled", false)
	viper.SetDefault("providers.bigdatacloud.api_key", "")
	viper.SetDefault("providers.ipqualityscore.enabled", false)
	viper.SetDefault("providers.ipqualityscore.api_key", "")
	viper.SetDefault("providers.scamalytics.enabled", false)
	viper.SetDefault("providers.scamalytics.api_key", "")

	viper.SetDefault("features.ipv6", true)
	viper.SetDefault("features.webrtc", true)
	viper.SetDefault("features.dns_leak", true)
	viper.SetDefault("features.service_check", true)
	viper.SetDefault("features.fraud_check", true)

	baseDir := GetBaseDir()
	viper.SetDefault("database.path", filepath.Join(baseDir, "database", "neocheck.db"))

	if err := ensureSecureDefaults(); err != nil {
		return err
	}

	configDir := filepath.Join(GetBaseDir(), "config")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return err
	}
	configPath := filepath.Join(configDir, "config.yaml")
	
	return viper.SafeWriteConfigAs(configPath)
}

func ensureSecureDefaults() error {
	modified := false

	jwtSecret := viper.GetString("security.jwt_secret")
	if jwtSecret == "" {
		secret, err := generateSecureRandom(32)
		if err != nil {
			return fmt.Errorf("failed to generate jwt_secret: %w", err)
		}
		viper.Set("security.jwt_secret", secret)
		modified = true
	}

	sessionSecret := viper.GetString("security.session_secret")
	if sessionSecret == "" {
		secret, err := generateSecureRandom(32)
		if err != nil {
			return fmt.Errorf("failed to generate session_secret: %w", err)
		}
		viper.Set("security.session_secret", secret)
		modified = true
	}

	if modified && viper.ConfigFileUsed() != "" {
		return viper.WriteConfig()
	}

	return nil
}

func generateSecureRandom(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
