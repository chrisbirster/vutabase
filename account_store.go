package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func newID(prefix string) string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(bytes))
}

func slugify(value string) string {
	slug := strings.ToLower(strings.TrimSpace(value))
	slug = slugPattern.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		return "workspace"
	}
	return slug
}

func (s *SQLiteStore) CreateUser(user *User) error {
	_, err := s.db.Exec(`
		INSERT INTO users (id, email, display_name, avatar_url, onboarding, last_login_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		user.ID,
		user.Email,
		user.DisplayName,
		nullIfEmpty(user.AvatarURL),
		boolToInt(user.Onboarding),
		nullIfZeroTime(user.LastLoginAt),
		user.CreatedAt.Unix(),
		user.UpdatedAt.Unix(),
	)
	return err
}

func (s *SQLiteStore) GetUserByID(id string) (*User, error) {
	row := s.db.QueryRow(`
		SELECT id, email, display_name, avatar_url, onboarding, last_login_at, created_at, updated_at
		FROM users
		WHERE id = ?
	`, id)

	var user User
	var avatar sql.NullString
	var onboarding int
	var lastLoginAt, createdAt, updatedAt sql.NullInt64
	if err := row.Scan(&user.ID, &user.Email, &user.DisplayName, &avatar, &onboarding, &lastLoginAt, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	if avatar.Valid {
		user.AvatarURL = avatar.String
	}
	user.Onboarding = onboarding == 1
	if lastLoginAt.Valid {
		user.LastLoginAt = time.Unix(lastLoginAt.Int64, 0)
	}
	if createdAt.Valid {
		user.CreatedAt = time.Unix(createdAt.Int64, 0)
	}
	if updatedAt.Valid {
		user.UpdatedAt = time.Unix(updatedAt.Int64, 0)
	}
	return &user, nil
}

func (s *SQLiteStore) GetUserByEmail(email string) (*User, error) {
	var userID string
	if err := s.db.QueryRow(`SELECT id FROM users WHERE lower(email) = lower(?)`, email).Scan(&userID); err != nil {
		return nil, err
	}
	return s.GetUserByID(userID)
}

func (s *SQLiteStore) CreateWorkspaceRecord(workspace *Workspace) error {
	_, err := s.db.Exec(`
		INSERT INTO workspaces (id, name, slug, owner_user_id, organization_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`,
		workspace.ID,
		workspace.Name,
		workspace.Slug,
		nullIfEmpty(workspace.OwnerUserID),
		nullIfEmpty(workspace.OrganizationID),
		workspace.CreatedAt.Unix(),
		workspace.UpdatedAt.Unix(),
	)
	return err
}

func (s *SQLiteStore) UpdateWorkspaceRecord(workspace *Workspace) error {
	_, err := s.db.Exec(`
		UPDATE workspaces
		SET name = ?, slug = ?, owner_user_id = ?, organization_id = ?, updated_at = ?
		WHERE id = ?
	`,
		workspace.Name,
		workspace.Slug,
		nullIfEmpty(workspace.OwnerUserID),
		nullIfEmpty(workspace.OrganizationID),
		workspace.UpdatedAt.Unix(),
		workspace.ID,
	)
	return err
}

func scanWorkspaceRow(scanner interface{ Scan(dest ...any) error }) (*Workspace, error) {
	var workspace Workspace
	var ownerID, orgID sql.NullString
	var createdAt, updatedAt int64
	if err := scanner.Scan(
		&workspace.ID,
		&workspace.Name,
		&workspace.Slug,
		&ownerID,
		&orgID,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}

	if ownerID.Valid {
		workspace.OwnerUserID = ownerID.String
	}
	if orgID.Valid {
		workspace.OrganizationID = orgID.String
	}
	workspace.CreatedAt = time.Unix(createdAt, 0)
	workspace.UpdatedAt = time.Unix(updatedAt, 0)
	return &workspace, nil
}

func (s *SQLiteStore) GetWorkspaceRecord(id string) (*Workspace, error) {
	row := s.db.QueryRow(`
		SELECT id, name, slug, owner_user_id, organization_id, created_at, updated_at
		FROM workspaces
		WHERE id = ?
	`, id)
	return scanWorkspaceRow(row)
}

func (s *SQLiteStore) GetFirstWorkspaceForUser(userID string) (*Workspace, error) {
	var workspaceID string
	err := s.db.QueryRow(`
		SELECT id
		FROM workspaces
		WHERE owner_user_id = ?
		ORDER BY created_at ASC
		LIMIT 1
	`, userID).Scan(&workspaceID)
	if err == nil {
		return s.GetWorkspaceRecord(workspaceID)
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	err = s.db.QueryRow(`
		SELECT w.id
		FROM workspaces w
		JOIN organization_members om ON om.organization_id = w.organization_id
		WHERE om.user_id = ? AND om.status = 'active'
		ORDER BY w.created_at ASC
		LIMIT 1
	`, userID).Scan(&workspaceID)
	if err != nil {
		return nil, err
	}
	return s.GetWorkspaceRecord(workspaceID)
}

func (s *SQLiteStore) CountWorkspacesForUser(userID string) (int, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(DISTINCT w.id)
		FROM workspaces w
		LEFT JOIN organization_members om ON om.organization_id = w.organization_id
		WHERE w.owner_user_id = ?
		   OR (om.user_id = ? AND om.status = 'active')
	`, userID, userID).Scan(&count)
	return count, err
}

func (s *SQLiteStore) GetWorkspaceForOrganization(orgID string) (*Workspace, error) {
	row := s.db.QueryRow(`
		SELECT id, name, slug, owner_user_id, organization_id, created_at, updated_at
		FROM workspaces
		WHERE organization_id = ?
		ORDER BY created_at ASC
		LIMIT 1
	`, orgID)
	return scanWorkspaceRow(row)
}

func (s *SQLiteStore) CreateOrganizationRecord(org *Organization) error {
	_, err := s.db.Exec(`
		INSERT INTO organizations (id, name, slug, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, org.ID, org.Name, org.Slug, org.CreatedAt.Unix(), org.UpdatedAt.Unix())
	return err
}

func (s *SQLiteStore) GetOrganizationRecord(id string) (*Organization, error) {
	row := s.db.QueryRow(`
		SELECT id, name, slug, created_at, updated_at
		FROM organizations
		WHERE id = ?
	`, id)

	var org Organization
	var createdAt, updatedAt int64
	if err := row.Scan(&org.ID, &org.Name, &org.Slug, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	org.CreatedAt = time.Unix(createdAt, 0)
	org.UpdatedAt = time.Unix(updatedAt, 0)
	return &org, nil
}

func (s *SQLiteStore) UpdateOrganizationRecord(org *Organization) error {
	_, err := s.db.Exec(`
		UPDATE organizations
		SET name = ?, slug = ?, updated_at = ?
		WHERE id = ?
	`, org.Name, org.Slug, org.UpdatedAt.Unix(), org.ID)
	return err
}

func (s *SQLiteStore) DeleteOrganizationRecord(id string) error {
	_, err := s.db.Exec(`DELETE FROM organizations WHERE id = ?`, id)
	return err
}

func (s *SQLiteStore) CreateOrganizationMemberRecord(member *OrganizationMember) error {
	_, err := s.db.Exec(`
		INSERT INTO organization_members (
			id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		member.ID,
		member.OrganizationID,
		nullIfEmpty(member.UserID),
		member.Email,
		member.Role,
		member.Status,
		nullIfEmpty(member.InviteToken),
		nullIfZeroTime(member.InviteExpiresAt),
		nullIfZeroTime(member.JoinedAt),
		nullIfZeroTime(member.RemovedAt),
		member.CreatedAt.Unix(),
	)
	return err
}

func (s *SQLiteStore) UpsertOrganizationInvitation(member *OrganizationMember) error {
	_, err := s.db.Exec(`
		INSERT INTO organization_members (
			id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(organization_id, email) DO UPDATE SET
			role = excluded.role,
			status = excluded.status,
			invite_token = excluded.invite_token,
			invite_expires_at = excluded.invite_expires_at,
			removed_at = excluded.removed_at
	`,
		member.ID,
		member.OrganizationID,
		nullIfEmpty(member.UserID),
		member.Email,
		member.Role,
		member.Status,
		nullIfEmpty(member.InviteToken),
		nullIfZeroTime(member.InviteExpiresAt),
		nullIfZeroTime(member.JoinedAt),
		nullIfZeroTime(member.RemovedAt),
		member.CreatedAt.Unix(),
	)
	return err
}

func scanOrganizationMemberRow(scanner interface{ Scan(dest ...any) error }) (*OrganizationMember, error) {
	var member OrganizationMember
	var userID, inviteToken sql.NullString
	var inviteExpiresAt, joinedAt, removedAt sql.NullInt64
	var createdAt int64
	if err := scanner.Scan(
		&member.ID,
		&member.OrganizationID,
		&userID,
		&member.Email,
		&member.Role,
		&member.Status,
		&inviteToken,
		&inviteExpiresAt,
		&joinedAt,
		&removedAt,
		&createdAt,
	); err != nil {
		return nil, err
	}
	if userID.Valid {
		member.UserID = userID.String
	}
	if inviteToken.Valid {
		member.InviteToken = inviteToken.String
	}
	if inviteExpiresAt.Valid {
		member.InviteExpiresAt = time.Unix(inviteExpiresAt.Int64, 0)
	}
	if joinedAt.Valid {
		member.JoinedAt = time.Unix(joinedAt.Int64, 0)
	}
	if removedAt.Valid {
		member.RemovedAt = time.Unix(removedAt.Int64, 0)
	}
	member.CreatedAt = time.Unix(createdAt, 0)
	return &member, nil
}

func (s *SQLiteStore) GetOrganizationMember(id string) (*OrganizationMember, error) {
	row := s.db.QueryRow(`
		SELECT id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		FROM organization_members
		WHERE id = ?
	`, id)
	return scanOrganizationMemberRow(row)
}

func (s *SQLiteStore) GetOrganizationMemberByUser(orgID, userID string) (*OrganizationMember, error) {
	row := s.db.QueryRow(`
		SELECT id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		FROM organization_members
		WHERE organization_id = ? AND user_id = ?
		LIMIT 1
	`, orgID, userID)
	return scanOrganizationMemberRow(row)
}

func (s *SQLiteStore) GetOrganizationMemberByEmail(orgID, email string) (*OrganizationMember, error) {
	row := s.db.QueryRow(`
		SELECT id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		FROM organization_members
		WHERE organization_id = ? AND lower(email) = lower(?)
		LIMIT 1
	`, orgID, email)
	return scanOrganizationMemberRow(row)
}

func (s *SQLiteStore) GetOrganizationMemberByInviteToken(token string) (*OrganizationMember, error) {
	row := s.db.QueryRow(`
		SELECT id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		FROM organization_members
		WHERE invite_token = ?
		LIMIT 1
	`, token)
	return scanOrganizationMemberRow(row)
}

func (s *SQLiteStore) ListOrganizationMembers(orgID string) ([]OrganizationMember, error) {
	rows, err := s.db.Query(`
		SELECT id, organization_id, user_id, email, role, status, invite_token, invite_expires_at, joined_at, removed_at, created_at
		FROM organization_members
		WHERE organization_id = ?
		ORDER BY created_at ASC
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []OrganizationMember
	for rows.Next() {
		member, err := scanOrganizationMemberRow(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, *member)
	}
	return members, rows.Err()
}

func (s *SQLiteStore) UpdateOrganizationMember(member *OrganizationMember) error {
	_, err := s.db.Exec(`
		UPDATE organization_members
		SET user_id = ?, email = ?, role = ?, status = ?, invite_token = ?, invite_expires_at = ?, joined_at = ?, removed_at = ?
		WHERE id = ?
	`,
		nullIfEmpty(member.UserID),
		member.Email,
		member.Role,
		member.Status,
		nullIfEmpty(member.InviteToken),
		nullIfZeroTime(member.InviteExpiresAt),
		nullIfZeroTime(member.JoinedAt),
		nullIfZeroTime(member.RemovedAt),
		member.ID,
	)
	return err
}

func (s *SQLiteStore) CountActiveOrganizationMembers(organizationID string) (int, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(1)
		FROM organization_members
		WHERE organization_id = ? AND status = 'active'
	`, organizationID).Scan(&count)
	return count, err
}

func (s *SQLiteStore) CreateSessionRecord(session *SessionRecord) error {
	_, err := s.db.Exec(`
		INSERT INTO sessions (id, user_id, workspace_id, plan, guest, expires_at, last_seen_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		session.ID,
		session.UserID,
		nullIfEmpty(session.WorkspaceID),
		string(session.Plan),
		boolToInt(session.Guest),
		session.ExpiresAt.Unix(),
		nullIfZeroTime(session.LastSeenAt),
		session.CreatedAt.Unix(),
	)
	return err
}

func (s *SQLiteStore) GetSessionRecord(id string) (*SessionRecord, error) {
	row := s.db.QueryRow(`
		SELECT id, user_id, workspace_id, plan, guest, expires_at, last_seen_at, created_at
		FROM sessions
		WHERE id = ?
	`, id)

	var session SessionRecord
	var workspaceID sql.NullString
	var plan string
	var guest int
	var expiresAt, lastSeenAt, createdAt sql.NullInt64
	if err := row.Scan(&session.ID, &session.UserID, &workspaceID, &plan, &guest, &expiresAt, &lastSeenAt, &createdAt); err != nil {
		return nil, err
	}
	if workspaceID.Valid {
		session.WorkspaceID = workspaceID.String
	}
	session.Plan = parsePlan(plan)
	session.Guest = guest == 1
	if expiresAt.Valid {
		session.ExpiresAt = time.Unix(expiresAt.Int64, 0)
	}
	if lastSeenAt.Valid {
		session.LastSeenAt = time.Unix(lastSeenAt.Int64, 0)
	}
	if createdAt.Valid {
		session.CreatedAt = time.Unix(createdAt.Int64, 0)
	}
	return &session, nil
}

func (s *SQLiteStore) DeleteSessionRecord(id string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE id = ?`, id)
	return err
}

func (s *SQLiteStore) TouchSessionRecord(id string, expiresAt, lastSeenAt time.Time) error {
	_, err := s.db.Exec(`
		UPDATE sessions
		SET expires_at = ?, last_seen_at = ?
		WHERE id = ?
	`, expiresAt.Unix(), lastSeenAt.Unix(), id)
	return err
}

func (s *SQLiteStore) UpdateSessionWorkspace(id, workspaceID string) error {
	_, err := s.db.Exec(`UPDATE sessions SET workspace_id = ? WHERE id = ?`, nullIfEmpty(workspaceID), id)
	return err
}

func (s *SQLiteStore) UpdateUserLastLogin(userID string, at time.Time) error {
	_, err := s.db.Exec(`UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`, at.Unix(), at.Unix(), userID)
	return err
}

func (s *SQLiteStore) UpdateUserOnboarding(userID string, onboarding bool) error {
	_, err := s.db.Exec(`UPDATE users SET onboarding = ?, updated_at = ? WHERE id = ?`, boolToInt(onboarding), time.Now().Unix(), userID)
	return err
}

func (s *SQLiteStore) UpsertSubscription(subscription *Subscription) error {
	if subscription.BilledQuantity <= 0 {
		subscription.BilledQuantity = 1
	}
	_, err := s.db.Exec(`
		INSERT INTO subscriptions (
			id, workspace_id, organization_id, plan, scheduled_plan, status, provider, provider_customer_id,
			provider_subscription_id, provider_subscription_item_id, provider_checkout_session_id,
			current_period_end, cancel_at_period_end, billed_quantity, created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			workspace_id = excluded.workspace_id,
			organization_id = excluded.organization_id,
			plan = excluded.plan,
			scheduled_plan = excluded.scheduled_plan,
			status = excluded.status,
			provider = excluded.provider,
			provider_customer_id = excluded.provider_customer_id,
			provider_subscription_id = excluded.provider_subscription_id,
			provider_subscription_item_id = excluded.provider_subscription_item_id,
			provider_checkout_session_id = excluded.provider_checkout_session_id,
			current_period_end = excluded.current_period_end,
			cancel_at_period_end = excluded.cancel_at_period_end,
			billed_quantity = excluded.billed_quantity,
			updated_at = excluded.updated_at
	`,
		subscription.ID,
		nullIfEmpty(subscription.WorkspaceID),
		nullIfEmpty(subscription.OrganizationID),
		string(subscription.Plan),
		nullIfEmpty(string(subscription.ScheduledPlan)),
		subscription.Status,
		nullIfEmpty(subscription.Provider),
		nullIfEmpty(subscription.ProviderCustomerID),
		nullIfEmpty(subscription.ProviderSubscriptionID),
		nullIfEmpty(subscription.ProviderSubscriptionItemID),
		nullIfEmpty(subscription.ProviderCheckoutSessionID),
		nullIfZeroTime(subscription.CurrentPeriodEnd),
		boolToInt(subscription.CancelAtPeriodEnd),
		subscription.BilledQuantity,
		subscription.CreatedAt.Unix(),
		subscription.UpdatedAt.Unix(),
	)
	return err
}

func scanSubscriptionRow(scanner interface{ Scan(dest ...any) error }) (*Subscription, error) {
	var subscription Subscription
	var workspaceID, organizationID, scheduledPlan, provider, customerID, subscriptionID, subscriptionItemID, checkoutSessionID sql.NullString
	var currentPeriodEnd, createdAt, updatedAt sql.NullInt64
	var cancelAtPeriodEnd, billedQuantity int
	var plan string
	if err := scanner.Scan(
		&subscription.ID,
		&workspaceID,
		&organizationID,
		&plan,
		&scheduledPlan,
		&subscription.Status,
		&provider,
		&customerID,
		&subscriptionID,
		&subscriptionItemID,
		&checkoutSessionID,
		&currentPeriodEnd,
		&cancelAtPeriodEnd,
		&billedQuantity,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	if workspaceID.Valid {
		subscription.WorkspaceID = workspaceID.String
	}
	if organizationID.Valid {
		subscription.OrganizationID = organizationID.String
	}
	if scheduledPlan.Valid {
		subscription.ScheduledPlan = parsePlan(scheduledPlan.String)
	}
	if provider.Valid {
		subscription.Provider = provider.String
	}
	if customerID.Valid {
		subscription.ProviderCustomerID = customerID.String
	}
	if subscriptionID.Valid {
		subscription.ProviderSubscriptionID = subscriptionID.String
	}
	if subscriptionItemID.Valid {
		subscription.ProviderSubscriptionItemID = subscriptionItemID.String
	}
	if checkoutSessionID.Valid {
		subscription.ProviderCheckoutSessionID = checkoutSessionID.String
	}
	if currentPeriodEnd.Valid {
		subscription.CurrentPeriodEnd = time.Unix(currentPeriodEnd.Int64, 0)
	}
	subscription.CancelAtPeriodEnd = cancelAtPeriodEnd == 1
	if billedQuantity > 0 {
		subscription.BilledQuantity = billedQuantity
	} else {
		subscription.BilledQuantity = 1
	}
	if createdAt.Valid {
		subscription.CreatedAt = time.Unix(createdAt.Int64, 0)
	}
	if updatedAt.Valid {
		subscription.UpdatedAt = time.Unix(updatedAt.Int64, 0)
	}
	subscription.Plan = parsePlan(plan)
	return &subscription, nil
}

func (s *SQLiteStore) GetSubscriptionForWorkspace(workspaceID string) (*Subscription, error) {
	row := s.db.QueryRow(`
		SELECT id, workspace_id, organization_id, plan, scheduled_plan, status, provider, provider_customer_id,
		       provider_subscription_id, provider_subscription_item_id, provider_checkout_session_id,
		       current_period_end, cancel_at_period_end, billed_quantity, created_at, updated_at
		FROM subscriptions
		WHERE workspace_id = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`, workspaceID)
	return scanSubscriptionRow(row)
}

func (s *SQLiteStore) GetSubscriptionForOrganization(organizationID string) (*Subscription, error) {
	row := s.db.QueryRow(`
		SELECT id, workspace_id, organization_id, plan, scheduled_plan, status, provider, provider_customer_id,
		       provider_subscription_id, provider_subscription_item_id, provider_checkout_session_id,
		       current_period_end, cancel_at_period_end, billed_quantity, created_at, updated_at
		FROM subscriptions
		WHERE organization_id = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`, organizationID)
	return scanSubscriptionRow(row)
}

func (s *SQLiteStore) GetSubscriptionByProviderSubscriptionID(providerSubscriptionID string) (*Subscription, error) {
	row := s.db.QueryRow(`
		SELECT id, workspace_id, organization_id, plan, scheduled_plan, status, provider, provider_customer_id,
		       provider_subscription_id, provider_subscription_item_id, provider_checkout_session_id,
		       current_period_end, cancel_at_period_end, billed_quantity, created_at, updated_at
		FROM subscriptions
		WHERE provider_subscription_id = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`, providerSubscriptionID)
	return scanSubscriptionRow(row)
}

func (s *SQLiteStore) GetSubscriptionByProviderCheckoutSessionID(providerCheckoutSessionID string) (*Subscription, error) {
	row := s.db.QueryRow(`
		SELECT id, workspace_id, organization_id, plan, scheduled_plan, status, provider, provider_customer_id,
		       provider_subscription_id, provider_subscription_item_id, provider_checkout_session_id,
		       current_period_end, cancel_at_period_end, billed_quantity, created_at, updated_at
		FROM subscriptions
		WHERE provider_checkout_session_id = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`, providerCheckoutSessionID)
	return scanSubscriptionRow(row)
}

func (s *SQLiteStore) CreateSubscriptionEvent(event *SubscriptionEvent) error {
	_, err := s.db.Exec(`
		INSERT OR IGNORE INTO subscription_events (id, subscription_id, event_type, provider_event_id, payload, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		event.ID,
		event.SubscriptionID,
		event.EventType,
		nullIfEmpty(event.ProviderEventID),
		nullIfEmpty(event.Payload),
		event.CreatedAt.Unix(),
	)
	return err
}
