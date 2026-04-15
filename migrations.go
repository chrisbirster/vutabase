package main

import (
	"database/sql"
	"fmt"
)

func (s *SQLiteStore) migrate() error {
	if err := s.ensureMetadataTable(); err != nil {
		return err
	}

	version, err := s.getSchemaVersion()
	if err != nil {
		return err
	}

	if version >= 1 {
		return nil
	}

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL UNIQUE,
		display_name TEXT NOT NULL,
		avatar_url TEXT,
		onboarding INTEGER NOT NULL DEFAULT 1,
		last_login_at INTEGER,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS otp_challenges (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL,
		code_hash TEXT NOT NULL,
		expires_at INTEGER NOT NULL,
		attempt_count INTEGER NOT NULL,
		max_attempts INTEGER NOT NULL,
		resend_available_at INTEGER NOT NULL,
		consumed_at INTEGER,
		requested_ip TEXT,
		user_agent TEXT,
		created_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS organizations (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS workspaces (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		owner_user_id TEXT,
		organization_id TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
		FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS organization_members (
		id TEXT PRIMARY KEY,
		organization_id TEXT NOT NULL,
		user_id TEXT,
		email TEXT NOT NULL,
		role TEXT NOT NULL,
		status TEXT NOT NULL,
		invite_token TEXT,
		invite_expires_at INTEGER,
		joined_at INTEGER,
		removed_at INTEGER,
		created_at INTEGER NOT NULL,
		UNIQUE (organization_id, email),
		FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		workspace_id TEXT,
		plan TEXT NOT NULL,
		guest INTEGER NOT NULL DEFAULT 0,
		expires_at INTEGER NOT NULL,
		last_seen_at INTEGER,
		created_at INTEGER NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS subscriptions (
		id TEXT PRIMARY KEY,
		workspace_id TEXT,
		organization_id TEXT,
		plan TEXT NOT NULL,
		scheduled_plan TEXT,
		status TEXT NOT NULL,
		provider TEXT,
		provider_customer_id TEXT,
		provider_subscription_id TEXT UNIQUE,
		provider_subscription_item_id TEXT,
		provider_checkout_session_id TEXT UNIQUE,
		current_period_end INTEGER,
		cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
		billed_quantity INTEGER NOT NULL DEFAULT 1,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
		FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS subscription_events (
		id TEXT PRIMARY KEY,
		subscription_id TEXT NOT NULL,
		event_type TEXT NOT NULL,
		provider_event_id TEXT UNIQUE,
		payload TEXT,
		created_at INTEGER NOT NULL,
		FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS app_settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);

	CREATE INDEX IF NOT EXISTS idx_otp_challenges_email_created ON otp_challenges(email, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
	CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);
	CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);
	CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(organization_id);
	CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
	CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id, status);
	CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id, updated_at DESC);
	CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id, updated_at DESC);
	`

	if _, err := s.db.Exec(schema); err != nil {
		return fmt.Errorf("failed to apply starter schema: %w", err)
	}

	return s.setSchemaVersion(1)
}

func (s *SQLiteStore) ensureMetadataTable() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`)
	return err
}

func (s *SQLiteStore) getSchemaVersion() (int, error) {
	var version int
	err := s.db.QueryRow(`SELECT value FROM metadata WHERE key = 'schema_version'`).Scan(&version)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return version, err
}

func (s *SQLiteStore) setSchemaVersion(version int) error {
	_, err := s.db.Exec(`
		INSERT INTO metadata (key, value)
		VALUES ('schema_version', ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, version)
	return err
}
