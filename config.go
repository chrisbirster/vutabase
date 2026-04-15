package main

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type DatabaseMode string

const (
	DatabaseModeSQLite DatabaseMode = "sqlite"
	DatabaseModeTurso  DatabaseMode = "turso"
)

type DatabaseConfig struct {
	Mode      DatabaseMode
	URL       string
	AuthToken string
	Path      string
}

type CookieConfig struct {
	Domain string
	Secure bool
}

type OTPConfig struct {
	TTL            time.Duration
	ResendCooldown time.Duration
	MaxAttempts    int
}

type EmailConfig struct {
	SendURL         string
	AuthHeaderName  string
	AuthHeaderValue string
}

type StripeConfig struct {
	SecretKey                 string
	WebhookSecret             string
	BillingPriceProMonthly    string
	BillingPriceTeamMonthly   string
	BillingCheckoutSuccessURL string
	BillingCheckoutCancelURL  string
	BillingPortalReturnURL    string
}

type AppConfig struct {
	AppName         string
	Environment     string
	Port            string
	Host            string
	AppOrigin       string
	MarketingOrigin string
	AllowedOrigins  []string
	Database        DatabaseConfig
	Cookie          CookieConfig
	OTP             OTPConfig
	SessionTTL      time.Duration
	SessionSecret   string
	Email           EmailConfig
	Stripe          StripeConfig
	AuthSuccessPath string
}

func LoadAppConfig() (AppConfig, error) {
	appName := stringEnv("APP_NAME", "Starter Template")
	environment := stringEnv("APP_ENV", "development")
	appOrigin := stringEnv("APP_ORIGIN", "http://localhost:3000")
	marketingOrigin := stringEnv("APP_MARKETING_ORIGIN", "http://localhost:4173")
	port := stringEnv("PORT", "8000")
	host := "localhost"
	if os.Getenv("PORT") != "" {
		host = "0.0.0.0"
	}

	database := DatabaseConfig{
		Path:      stringEnv("APP_DATABASE_PATH", "./data/app.db"),
		URL:       lookupEnv("APP_DATABASE_URL"),
		AuthToken: lookupEnv("APP_DATABASE_AUTH_TOKEN"),
	}
	if database.URL != "" {
		database.Mode = DatabaseModeTurso
	} else {
		database.Mode = DatabaseModeSQLite
	}

	cookieSecureDefault := boolEnv("APP_COOKIE_SECURE", database.Mode == DatabaseModeTurso || strings.HasPrefix(appOrigin, "https://"))
	cookieDomain := lookupEnv("APP_COOKIE_DOMAIN")
	if cookieDomain == "" && cookieSecureDefault {
		cookieDomain = deriveCookieDomain(appOrigin)
	}

	sessionSecret := lookupEnv("APP_SESSION_SECRET")
	if sessionSecret == "" {
		sessionSecret = "dev-session-secret-change-me"
	}

	cfg := AppConfig{
		AppName:         appName,
		Environment:     environment,
		Port:            port,
		Host:            host,
		AppOrigin:       appOrigin,
		MarketingOrigin: marketingOrigin,
		AllowedOrigins:  buildAllowedOrigins(appOrigin, marketingOrigin),
		Database:        database,
		Cookie: CookieConfig{
			Domain: cookieDomain,
			Secure: cookieSecureDefault,
		},
		OTP: OTPConfig{
			TTL:            time.Duration(intEnv("APP_OTP_TTL_MINUTES", 10)) * time.Minute,
			ResendCooldown: time.Duration(intEnv("APP_OTP_RESEND_SECONDS", 60)) * time.Second,
			MaxAttempts:    intEnv("APP_OTP_MAX_ATTEMPTS", 5),
		},
		SessionTTL: time.Duration(intEnv("APP_SESSION_TTL_DAYS", 7)) * 24 * time.Hour,
		SessionSecret: sessionSecret,
		Email: EmailConfig{
			SendURL:         lookupEnv("APP_EMAIL_SEND_URL"),
			AuthHeaderName:  stringEnv("APP_EMAIL_SEND_AUTH_HEADER", "Authorization"),
			AuthHeaderValue: lookupEnv("APP_EMAIL_SEND_AUTH_VALUE"),
		},
		Stripe: StripeConfig{
			SecretKey:                 lookupEnv("APP_STRIPE_SECRET_KEY"),
			WebhookSecret:             lookupEnv("APP_STRIPE_WEBHOOK_SECRET"),
			BillingPriceProMonthly:    lookupEnv("APP_STRIPE_BILLING_PRICE_PRO_MONTHLY"),
			BillingPriceTeamMonthly:   lookupEnv("APP_STRIPE_BILLING_PRICE_TEAM_MONTHLY"),
			BillingCheckoutSuccessURL: stringEnv("APP_STRIPE_BILLING_CHECKOUT_SUCCESS_URL", strings.TrimRight(appOrigin, "/")+"/billing/complete?checkout=success"),
			BillingCheckoutCancelURL:  stringEnv("APP_STRIPE_BILLING_CHECKOUT_CANCEL_URL", strings.TrimRight(appOrigin, "/")+"/billing/complete?checkout=cancelled"),
			BillingPortalReturnURL:    stringEnv("APP_STRIPE_BILLING_PORTAL_RETURN_URL", strings.TrimRight(appOrigin, "/")+"/settings?billing=returned"),
		},
		AuthSuccessPath: stringEnv("APP_AUTH_SUCCESS_URL", "/"),
	}

	if cfg.Database.Mode == DatabaseModeTurso && cfg.Database.AuthToken == "" {
		return AppConfig{}, fmt.Errorf("APP_DATABASE_AUTH_TOKEN is required when APP_DATABASE_URL is set")
	}

	return cfg, nil
}

func mustLocalAppConfig() AppConfig {
	cfg, err := LoadAppConfig()
	if err == nil {
		return cfg
	}

	return AppConfig{
		AppName:         "Starter Template",
		Environment:     "development",
		Port:            "8000",
		Host:            "localhost",
		AppOrigin:       "http://localhost:3000",
		MarketingOrigin: "http://localhost:4173",
		AllowedOrigins:  buildAllowedOrigins("http://localhost:3000", "http://localhost:4173"),
		Database: DatabaseConfig{
			Mode: DatabaseModeSQLite,
			Path: "./data/app.db",
		},
		Cookie: CookieConfig{
			Secure: false,
		},
		OTP: OTPConfig{
			TTL:            10 * time.Minute,
			ResendCooldown: 60 * time.Second,
			MaxAttempts:    5,
		},
		SessionTTL:    7 * 24 * time.Hour,
		SessionSecret: "dev-session-secret-change-me",
		Email: EmailConfig{
			AuthHeaderName: "Authorization",
		},
		Stripe: StripeConfig{
			BillingCheckoutSuccessURL: "http://localhost:3000/billing/complete?checkout=success",
			BillingCheckoutCancelURL:  "http://localhost:3000/billing/complete?checkout=cancelled",
			BillingPortalReturnURL:    "http://localhost:3000/settings?billing=returned",
		},
		AuthSuccessPath: "/",
	}
}

func (cfg AppConfig) IsDevelopment() bool {
	return strings.ToLower(strings.TrimSpace(cfg.Environment)) != "production"
}

func (cfg AppConfig) BillingEnabled() bool {
	if cfg.IsDevelopment() {
		return true
	}
	return strings.TrimSpace(cfg.Stripe.SecretKey) != "" &&
		(strings.TrimSpace(cfg.Stripe.BillingPriceProMonthly) != "" || strings.TrimSpace(cfg.Stripe.BillingPriceTeamMonthly) != "")
}

func buildAllowedOrigins(appOrigin, marketingOrigin string) []string {
	origins := []string{
		appOrigin,
		marketingOrigin,
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:4173",
		"http://127.0.0.1:4173",
	}

	if extra := lookupEnv("APP_ALLOWED_ORIGINS"); extra != "" {
		for _, origin := range strings.Split(extra, ",") {
			origins = append(origins, strings.TrimSpace(origin))
		}
	}

	seen := make(map[string]struct{}, len(origins))
	filtered := make([]string, 0, len(origins))
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			continue
		}
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			continue
		}
		if _, ok := seen[origin]; ok {
			continue
		}
		seen[origin] = struct{}{}
		filtered = append(filtered, origin)
	}

	return filtered
}

func deriveCookieDomain(appOrigin string) string {
	parsed, err := url.Parse(strings.TrimSpace(appOrigin))
	if err != nil {
		return ""
	}
	host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	if strings.HasPrefix(host, "app.") {
		return "." + strings.TrimPrefix(host, "app.")
	}
	return ""
}

func lookupEnv(key string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return ""
}

func stringEnv(key string, fallback string) string {
	if value := lookupEnv(key); value != "" {
		return value
	}
	return fallback
}

func intEnv(key string, fallback int) int {
	value := lookupEnv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func boolEnv(key string, fallback bool) bool {
	value := lookupEnv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
