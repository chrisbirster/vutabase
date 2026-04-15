package main

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

type SQLiteStore struct {
	db *sql.DB
}

func NewSQLiteStore(dbPath string) (*SQLiteStore, error) {
	return OpenStore(DatabaseConfig{
		Mode: DatabaseModeSQLite,
		Path: dbPath,
	})
}

func OpenStore(cfg DatabaseConfig) (*SQLiteStore, error) {
	driverName, dsn, err := databaseDSN(cfg)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open(driverName, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	store := &SQLiteStore{db: db}
	if err := store.migrate(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migration failed: %w", err)
	}
	return store, nil
}

func databaseDSN(cfg DatabaseConfig) (string, string, error) {
	switch cfg.Mode {
	case DatabaseModeTurso:
		if strings.TrimSpace(cfg.URL) == "" {
			return "", "", fmt.Errorf("database URL is required for Turso mode")
		}
		dsn := strings.TrimSpace(cfg.URL)
		if strings.TrimSpace(cfg.AuthToken) != "" {
			separator := "?"
			if strings.Contains(dsn, "?") {
				separator = "&"
			}
			dsn = dsn + separator + "authToken=" + url.QueryEscape(strings.TrimSpace(cfg.AuthToken))
		}
		return "libsql", dsn, nil
	case DatabaseModeSQLite, "":
		dbPath := strings.TrimSpace(cfg.Path)
		if dbPath == "" {
			dbPath = "./data/app.db"
		}
		if dir := filepath.Dir(dbPath); dir != "." && dir != "" {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return "", "", fmt.Errorf("failed to create database directory: %w", err)
			}
		}
		return "sqlite3", dbPath + "?_foreign_keys=on", nil
	default:
		return "", "", fmt.Errorf("unsupported database mode: %s", cfg.Mode)
	}
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func nullIfEmpty(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func nullIfZeroTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value.Unix()
}
