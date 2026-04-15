package main

import "testing"

func TestLoadAppConfigUsesAPPEnv(t *testing.T) {
	t.Setenv("APP_NAME", "Starter Template Alpha")
	t.Setenv("APP_ORIGIN", "https://app.starter-template.example.com")
	t.Setenv("APP_MARKETING_ORIGIN", "https://starter-template.example.com")
	t.Setenv("APP_DATABASE_PATH", "./data/custom.db")
	t.Setenv("APP_AUTH_SUCCESS_URL", "/")

	cfg, err := LoadAppConfig()
	if err != nil {
		t.Fatalf("LoadAppConfig returned error: %v", err)
	}

	if cfg.AppName != "Starter Template Alpha" {
		t.Fatalf("expected APP_NAME value, got %q", cfg.AppName)
	}
	if cfg.AppOrigin != "https://app.starter-template.example.com" {
		t.Fatalf("expected APP_ORIGIN value, got %q", cfg.AppOrigin)
	}
	if cfg.MarketingOrigin != "https://starter-template.example.com" {
		t.Fatalf("expected APP_MARKETING_ORIGIN value, got %q", cfg.MarketingOrigin)
	}
	if cfg.Database.Path != "./data/custom.db" {
		t.Fatalf("expected APP_DATABASE_PATH value, got %q", cfg.Database.Path)
	}
	if cfg.AuthSuccessPath != "/" {
		t.Fatalf("expected APP_AUTH_SUCCESS_URL value, got %q", cfg.AuthSuccessPath)
	}
}

func TestLoadAppConfigUsesStarterDefaults(t *testing.T) {
	t.Setenv("APP_NAME", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("APP_ORIGIN", "")
	t.Setenv("APP_MARKETING_ORIGIN", "")
	t.Setenv("APP_DATABASE_PATH", "")
	t.Setenv("APP_DATABASE_URL", "")
	t.Setenv("APP_DATABASE_AUTH_TOKEN", "")
	t.Setenv("APP_SESSION_SECRET", "")
	t.Setenv("APP_AUTH_SUCCESS_URL", "")

	cfg, err := LoadAppConfig()
	if err != nil {
		t.Fatalf("LoadAppConfig returned error: %v", err)
	}

	if cfg.AppName != "Starter Template" {
		t.Fatalf("expected default app name, got %q", cfg.AppName)
	}
	if cfg.AppOrigin != "http://localhost:3000" {
		t.Fatalf("expected default app origin, got %q", cfg.AppOrigin)
	}
	if cfg.MarketingOrigin != "http://localhost:4173" {
		t.Fatalf("expected default marketing origin, got %q", cfg.MarketingOrigin)
	}
	if cfg.Database.Path != "./data/app.db" {
		t.Fatalf("expected default database path, got %q", cfg.Database.Path)
	}
	if cfg.AuthSuccessPath != "/" {
		t.Fatalf("expected default auth success path, got %q", cfg.AuthSuccessPath)
	}
}
