package browser

import (
	"context"
	"regexp"
	"strings"

	"neocheck-backend/internal/config"
	"neocheck-backend/internal/report"
)

type BrowserProvider struct{}

func New() *BrowserProvider {
	return &BrowserProvider{}
}

func (p *BrowserProvider) Name() string {
	return "browser"
}

func (p *BrowserProvider) Initialize(cfg *config.Config) error {
	return nil
}

func (p *BrowserProvider) Check(ctx context.Context, req *report.Request) (any, error) {
	ua := req.UserAgent
	if ua == "" {
		return report.BrowserResult{
			Browser:         "Unknown",
			BrowserVersion:  "Unknown",
			OperatingSystem: "Unknown",
			Platform:        "Unknown",
			Language:        req.Headers["Accept-Language"],
			UserAgent:       "",
		}, nil
	}

	// 1. Detect OS
	os := "Unknown"
	if strings.Contains(ua, "Windows NT 10.0") {
		// Windows 11 and Windows 10 both use NT 10.0.
		// We'll default to "Windows 10/11", and let the frontend client hints refine it to Windows 11.
		os = "Windows 10/11"
	} else if strings.Contains(ua, "Windows NT 6.3") {
		os = "Windows 8.1"
	} else if strings.Contains(ua, "Windows NT 6.2") {
		os = "Windows 8"
	} else if strings.Contains(ua, "Windows NT 6.1") {
		os = "Windows 7"
	} else if strings.Contains(ua, "Android") {
		// Extract Android version if possible
		re := regexp.MustCompile(`Android\s+([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			os = "Android " + match[1]
		} else {
			os = "Android"
		}
	} else if strings.Contains(ua, "iPhone") || strings.Contains(ua, "iPad") || strings.Contains(ua, "iPod") {
		re := regexp.MustCompile(`OS\s+([0-9_]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			os = "iOS " + strings.ReplaceAll(match[1], "_", ".")
		} else {
			os = "iOS"
		}
	} else if strings.Contains(ua, "Mac OS X") {
		re := regexp.MustCompile(`Mac OS X\s+([0-9_\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			os = "macOS " + strings.ReplaceAll(match[1], "_", ".")
		} else {
			os = "macOS"
		}
	} else if strings.Contains(ua, "Linux") {
		if strings.Contains(ua, "Ubuntu") {
			os = "Ubuntu Linux"
		} else if strings.Contains(ua, "Debian") {
			os = "Debian Linux"
		} else if strings.Contains(ua, "Fedora") {
			os = "Fedora Linux"
		} else {
			os = "Linux"
		}
	}

	// 2. Detect Browser and Version
	browser := "Unknown"
	version := "Unknown"

	// Ordered detection to avoid false positives (e.g. Chrome UA contains Safari)
	if strings.Contains(ua, "Edg/") || strings.Contains(ua, "Edge/") {
		browser = "Edge"
		re := regexp.MustCompile(`Edg(?:e)?\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	} else if strings.Contains(ua, "OPR/") || strings.Contains(ua, "Opera/") {
		browser = "Opera"
		re := regexp.MustCompile(`(?:OPR|Opera)\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	} else if strings.Contains(ua, "Vivaldi/") {
		browser = "Vivaldi"
		re := regexp.MustCompile(`Vivaldi\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	} else if strings.Contains(ua, "Brave/") {
		browser = "Brave"
		re := regexp.MustCompile(`Brave\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	} else if strings.Contains(ua, "Firefox/") {
		browser = "Firefox"
		re := regexp.MustCompile(`Firefox\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	} else if strings.Contains(ua, "Chrome/") {
		browser = "Chrome"
		re := regexp.MustCompile(`Chrome\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	} else if strings.Contains(ua, "Safari/") && !strings.Contains(ua, "Chrome") {
		browser = "Safari"
		re := regexp.MustCompile(`Version\/([0-9\.]+)`)
		match := re.FindStringSubmatch(ua)
		if len(match) > 1 {
			version = match[1]
		}
	}

	// 3. Detect Platform (Desktop, Mobile, Tablet)
	platform := "Desktop"
	lowerUA := strings.ToLower(ua)
	if strings.Contains(lowerUA, "mobi") {
		platform = "Mobile"
	}
	if strings.Contains(lowerUA, "ipad") || strings.Contains(lowerUA, "tablet") {
		platform = "Tablet"
	}

	lang := req.Headers["Accept-Language"]
	if lang != "" {
		// Keep only the first language code
		parts := strings.Split(lang, ",")
		if len(parts) > 0 {
			lang = strings.Split(parts[0], ";")[0]
		}
	} else {
		lang = "Unknown"
	}

	return report.BrowserResult{
		Browser:         browser,
		BrowserVersion:  version,
		OperatingSystem: os,
		Platform:        platform,
		Language:        lang,
		UserAgent:       ua,
	}, nil
}

func (p *BrowserProvider) Shutdown() error {
	return nil
}
