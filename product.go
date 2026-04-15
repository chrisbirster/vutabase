package main

import "time"

type Plan string

const (
	PlanGuest      Plan = "guest"
	PlanFree       Plan = "free"
	PlanPro        Plan = "pro"
	PlanTeam       Plan = "team"
	PlanEnterprise Plan = "enterprise"
)

type PlanLimits struct {
	MaxMembers    int `json:"maxMembers"`
	MaxWorkspaces int `json:"maxWorkspaces"`
}

type EntitlementUsage struct {
	Members    int `json:"members"`
	Workspaces int `json:"workspaces"`
}

type EntitlementFeatures struct {
	OTPAuth bool `json:"otpAuth"`
	Billing bool `json:"billing"`
	Teams   bool `json:"teams"`
}

type Entitlements struct {
	Plan     Plan                `json:"plan"`
	Limits   PlanLimits          `json:"limits"`
	Usage    EntitlementUsage    `json:"usage"`
	Features EntitlementFeatures `json:"features"`
}

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
	Onboarding  bool      `json:"onboarding"`
	LastLoginAt time.Time `json:"lastLoginAt,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Workspace struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	OwnerUserID    string    `json:"ownerUserId,omitempty"`
	OrganizationID string    `json:"organizationId,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type OrganizationMember struct {
	ID              string    `json:"id"`
	OrganizationID  string    `json:"organizationId"`
	UserID          string    `json:"userId,omitempty"`
	Email           string    `json:"email"`
	Role            string    `json:"role"`
	Status          string    `json:"status"`
	InviteToken     string    `json:"inviteToken,omitempty"`
	InviteExpiresAt time.Time `json:"inviteExpiresAt,omitempty"`
	JoinedAt        time.Time `json:"joinedAt,omitempty"`
	RemovedAt       time.Time `json:"removedAt,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
}

type SessionRecord struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	WorkspaceID string    `json:"workspaceId,omitempty"`
	Plan        Plan      `json:"plan"`
	Guest       bool      `json:"guest"`
	ExpiresAt   time.Time `json:"expiresAt"`
	LastSeenAt  time.Time `json:"lastSeenAt,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

type OTPChallenge struct {
	ID                string
	Email             string
	CodeHash          string
	ExpiresAt         time.Time
	AttemptCount      int
	MaxAttempts       int
	ResendAvailableAt time.Time
	ConsumedAt        time.Time
	RequestedIP       string
	UserAgent         string
	CreatedAt         time.Time
}

type Subscription struct {
	ID                         string    `json:"id"`
	WorkspaceID                string    `json:"workspaceId,omitempty"`
	OrganizationID             string    `json:"organizationId,omitempty"`
	Plan                       Plan      `json:"plan"`
	ScheduledPlan              Plan      `json:"scheduledPlan,omitempty"`
	Status                     string    `json:"status"`
	Provider                   string    `json:"provider,omitempty"`
	ProviderCustomerID         string    `json:"providerCustomerId,omitempty"`
	ProviderSubscriptionID     string    `json:"providerSubscriptionId,omitempty"`
	ProviderSubscriptionItemID string    `json:"providerSubscriptionItemId,omitempty"`
	ProviderCheckoutSessionID  string    `json:"providerCheckoutSessionId,omitempty"`
	CurrentPeriodEnd           time.Time `json:"currentPeriodEnd,omitempty"`
	CancelAtPeriodEnd          bool      `json:"cancelAtPeriodEnd,omitempty"`
	BilledQuantity             int       `json:"billedQuantity"`
	CreatedAt                  time.Time `json:"createdAt"`
	UpdatedAt                  time.Time `json:"updatedAt"`
}

type SubscriptionEvent struct {
	ID              string    `json:"id"`
	SubscriptionID  string    `json:"subscriptionId"`
	EventType       string    `json:"eventType"`
	ProviderEventID string    `json:"providerEventId,omitempty"`
	Payload         string    `json:"payload,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
}

type AuthSessionResponse struct {
	Authenticated      bool                `json:"authenticated"`
	OTPAuthEnabled     bool                `json:"otpAuthEnabled"`
	User               *User               `json:"user,omitempty"`
	Workspace          *Workspace          `json:"workspace,omitempty"`
	Organization       *Organization       `json:"organization,omitempty"`
	OrganizationMember *OrganizationMember `json:"organizationMember,omitempty"`
	Subscription       *Subscription       `json:"subscription,omitempty"`
	Entitlements       Entitlements        `json:"entitlements"`
}

type BillingCheckoutResponse struct {
	Provider     string               `json:"provider"`
	Plan         Plan                 `json:"plan"`
	CheckoutURL  string               `json:"checkoutUrl,omitempty"`
	Completed    bool                 `json:"completed"`
	Message      string               `json:"message,omitempty"`
	Session      *AuthSessionResponse `json:"session,omitempty"`
	Subscription *Subscription        `json:"subscription,omitempty"`
}

type BillingPortalResponse struct {
	Provider string `json:"provider"`
	URL      string `json:"url"`
	Message  string `json:"message,omitempty"`
}

type BillingCheckoutSyncResponse struct {
	Provider     string               `json:"provider"`
	Completed    bool                 `json:"completed"`
	Message      string               `json:"message,omitempty"`
	Session      *AuthSessionResponse `json:"session,omitempty"`
	Subscription *Subscription        `json:"subscription,omitempty"`
}

type CreateOrganizationRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug,omitempty"`
}

type AddOrganizationMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

type UpdateOrganizationRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug,omitempty"`
}

type UpdateOrganizationMemberRequest struct {
	Role   string `json:"role,omitempty"`
	Status string `json:"status,omitempty"`
}

type JoinOrganizationRequest struct {
	Token string `json:"token"`
}

type UpdateWorkspacePlanRequest struct {
	Plan Plan `json:"plan"`
}

type OrganizationDetail struct {
	Organization     Organization         `json:"organization"`
	Workspace        *Workspace           `json:"workspace,omitempty"`
	Subscription     *Subscription        `json:"subscription,omitempty"`
	Membership       OrganizationMember   `json:"membership"`
	Members          []OrganizationMember `json:"members"`
	CanManagePlan    bool                 `json:"canManagePlan"`
	CanManageMembers bool                 `json:"canManageMembers"`
	CanEdit          bool                 `json:"canEdit"`
}

type BootstrapOrigins struct {
	App       string `json:"app"`
	Marketing string `json:"marketing"`
}

type BootstrapFeatureFlags struct {
	OTPAuth bool `json:"otpAuth"`
	Billing bool `json:"billing"`
	Teams   bool `json:"teams"`
}

type BootstrapResponse struct {
	AppName        string                `json:"appName"`
	Environment    string                `json:"environment"`
	BillingEnabled bool                  `json:"billingEnabled"`
	Origins        BootstrapOrigins      `json:"origins"`
	FeatureFlags   BootstrapFeatureFlags `json:"featureFlags"`
	Session        *AuthSessionResponse  `json:"session,omitempty"`
}
