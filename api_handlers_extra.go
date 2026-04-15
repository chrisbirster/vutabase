package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

const sessionCookieName = "starter_app_session"

type contextKey string

const sessionContextKey contextKey = "starter_app_session"

type billingCheckoutRequest struct {
	Plan Plan `json:"plan"`
}

type billingPortalRequest struct {
	Plan Plan `json:"plan,omitempty"`
}

type APIHandler struct {
	store               *SQLiteStore
	config              AppConfig
	emailSender         EmailSender
	subscriptionBilling subscriptionBillingProvider
}

func NewAPIHandlerWithConfig(store *SQLiteStore, cfg AppConfig, emailSender EmailSender) *APIHandler {
	return &APIHandler{
		store:               store,
		config:              cfg,
		emailSender:         emailSender,
		subscriptionBilling: newSubscriptionBillingProvider(cfg),
	}
}

func registerAPIRoutes(r chi.Router, handler *APIHandler) {
	r.Use(handler.SessionMiddleware)

	r.Get("/health", handler.HealthCheck)
	r.Get("/bootstrap", handler.GetBootstrap)
	r.Post("/billing/webhook", handler.BillingWebhook)

	r.Route("/auth", func(r chi.Router) {
		r.Get("/session", handler.GetAuthSession)
		r.Post("/request-otp", handler.RequestOTP)
		r.Post("/verify-otp", handler.VerifyOTP)
		r.Post("/logout", handler.Logout)
	})

	r.Group(func(r chi.Router) {
		r.Use(handler.RequireAuthenticatedUser)

		r.Get("/me", handler.GetMe)
		r.Post("/onboarding/plan", handler.CompleteOnboardingPlanSelection)

		r.Post("/billing/checkout", handler.BillingCheckout)
		r.Post("/billing/portal", handler.BillingPortal)
		r.Post("/billing/checkout/sessions/{sessionId}/sync", handler.BillingCheckoutSync)

		r.Post("/orgs", handler.CreateOrganization)
		r.Get("/orgs/{orgId}", handler.GetOrganization)
		r.Patch("/orgs/{orgId}", handler.UpdateOrganization)
		r.Delete("/orgs/{orgId}", handler.DeleteOrganization)
		r.Get("/orgs/{orgId}/members", handler.ListOrganizationMembers)
		r.Post("/orgs/{orgId}/members", handler.AddOrganizationMember)
		r.Patch("/orgs/{orgId}/members/{memberId}", handler.UpdateOrganizationMember)
		r.Delete("/orgs/{orgId}/members/{memberId}", handler.DeleteOrganizationMember)
		r.Post("/orgs/join", handler.JoinOrganization)
		r.Patch("/workspaces/{workspaceId}/plan", handler.UpdateWorkspacePlan)
	})
}

func (h *APIHandler) writeCookie(w http.ResponseWriter, name, value string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.config.Cookie.Secure,
		Domain:   h.config.Cookie.Domain,
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
	})
}

func (h *APIHandler) clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.config.Cookie.Secure,
		Domain:   h.config.Cookie.Domain,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func (h *APIHandler) sessionFromRequest(r *http.Request) *SessionRecord {
	if session, ok := r.Context().Value(sessionContextKey).(*SessionRecord); ok {
		return session
	}

	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return nil
	}

	session, err := h.store.GetSessionRecord(cookie.Value)
	if err != nil || session == nil {
		return nil
	}
	if !session.ExpiresAt.IsZero() && session.ExpiresAt.Before(time.Now()) {
		_ = h.store.DeleteSessionRecord(session.ID)
		return nil
	}
	return session
}

func (h *APIHandler) SessionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := h.sessionFromRequest(r)
		if session != nil && session.UserID != "" {
			now := time.Now()
			session.LastSeenAt = now
			session.ExpiresAt = now.Add(h.config.SessionTTL)
			if err := h.store.TouchSessionRecord(session.ID, session.ExpiresAt, session.LastSeenAt); err == nil {
				h.writeCookie(w, sessionCookieName, session.ID, session.ExpiresAt)
			}
		}
		ctx := context.WithValue(r.Context(), sessionContextKey, session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *APIHandler) RequireAuthenticatedUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session := h.sessionFromRequest(r)
		if session == nil || session.UserID == "" {
			respondAPIError(w, http.StatusUnauthorized, "auth_required", "You must be signed in to access this resource.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *APIHandler) billingAvailable() bool {
	return h.config.BillingEnabled()
}

func (h *APIHandler) planForRequest(r *http.Request, session *SessionRecord) Plan {
	if subscription := h.subscriptionForSession(session); subscriptionGrantsPlan(subscription, time.Now()) {
		return subscription.Plan
	}
	return resolvePlanFromRequest(r, session)
}

func (h *APIHandler) subscriptionForSession(session *SessionRecord) *Subscription {
	if session == nil || strings.TrimSpace(session.WorkspaceID) == "" {
		return nil
	}
	if subscription, err := h.store.GetSubscriptionForWorkspace(session.WorkspaceID); err == nil && subscription != nil {
		return subscription
	}
	workspace, err := h.store.GetWorkspaceRecord(session.WorkspaceID)
	if err != nil || workspace == nil || strings.TrimSpace(workspace.OrganizationID) == "" {
		return nil
	}
	if subscription, err := h.store.GetSubscriptionForOrganization(workspace.OrganizationID); err == nil {
		return subscription
	}
	return nil
}

func (h *APIHandler) workspaceForSession(session *SessionRecord) (*Workspace, error) {
	if session == nil || strings.TrimSpace(session.WorkspaceID) == "" {
		return nil, nil
	}
	return h.store.GetWorkspaceRecord(session.WorkspaceID)
}

func (h *APIHandler) usageForSession(session *SessionRecord) EntitlementUsage {
	usage := EntitlementUsage{}
	if session == nil || strings.TrimSpace(session.UserID) == "" {
		return usage
	}

	if count, err := h.store.CountWorkspacesForUser(session.UserID); err == nil {
		usage.Workspaces = count
	}

	usage.Members = 1
	workspace, err := h.workspaceForSession(session)
	if err == nil && workspace != nil && strings.TrimSpace(workspace.OrganizationID) != "" {
		if count, err := h.store.CountActiveOrganizationMembers(workspace.OrganizationID); err == nil && count > 0 {
			usage.Members = count
		}
	}

	return usage
}

func (h *APIHandler) buildSessionResponse(r *http.Request) AuthSessionResponse {
	session := h.sessionFromRequest(r)
	plan := PlanGuest
	if session != nil {
		plan = h.planForRequest(r, session)
	}

	response := AuthSessionResponse{
		Authenticated:  session != nil && session.UserID != "",
		OTPAuthEnabled: true,
		Entitlements:   entitlementsForPlan(plan, h.usageForSession(session), h.billingAvailable()),
	}
	if session == nil {
		return response
	}

	response.Subscription = h.subscriptionForSession(session)
	if user, err := h.store.GetUserByID(session.UserID); err == nil {
		response.User = user
	}
	if session.WorkspaceID != "" {
		if workspace, err := h.store.GetWorkspaceRecord(session.WorkspaceID); err == nil {
			response.Workspace = workspace
			if workspace.OrganizationID != "" {
				if org, err := h.store.GetOrganizationRecord(workspace.OrganizationID); err == nil {
					response.Organization = org
				}
				if member, err := h.store.GetOrganizationMemberByUser(workspace.OrganizationID, session.UserID); err == nil {
					response.OrganizationMember = member
				}
			}
		}
	}

	return response
}

func (h *APIHandler) buildBootstrapResponse(r *http.Request) BootstrapResponse {
	response := BootstrapResponse{
		AppName:        h.config.AppName,
		Environment:    h.config.Environment,
		BillingEnabled: h.billingAvailable(),
		Origins: BootstrapOrigins{
			App:       h.config.AppOrigin,
			Marketing: h.config.MarketingOrigin,
		},
		FeatureFlags: BootstrapFeatureFlags{
			OTPAuth: true,
			Billing: h.billingAvailable(),
			Teams:   true,
		},
	}

	session := h.buildSessionResponse(r)
	if session.Authenticated {
		response.Session = &session
	}

	return response
}

func (h *APIHandler) ensureDefaultWorkspaceForUser(user *User) (*Workspace, error) {
	workspace, err := h.store.GetFirstWorkspaceForUser(user.ID)
	if err == nil {
		return workspace, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	now := time.Now()
	nameRoot := firstNonEmpty(strings.TrimSpace(user.DisplayName), "Personal")
	idSuffix := user.ID
	if len(idSuffix) > 6 {
		idSuffix = idSuffix[len(idSuffix)-6:]
	}
	workspace = &Workspace{
		ID:          newID("ws"),
		Name:        fmt.Sprintf("%s Workspace", nameRoot),
		Slug:        fmt.Sprintf("%s-%s", slugify(firstNonEmpty(user.DisplayName, user.Email)), slugify(idSuffix)),
		OwnerUserID: user.ID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	return workspace, h.store.CreateWorkspaceRecord(workspace)
}

func (h *APIHandler) HealthCheck(w http.ResponseWriter, _ *http.Request) {
	respondJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "starter-api",
		"version": "starter-template",
	})
}

func (h *APIHandler) GetBootstrap(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, h.buildBootstrapResponse(r))
}

func (h *APIHandler) GetAuthSession(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, h.buildSessionResponse(r))
}

func (h *APIHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, h.buildSessionResponse(r))
}

func (h *APIHandler) Logout(w http.ResponseWriter, r *http.Request) {
	session := h.sessionFromRequest(r)
	if session != nil {
		_ = h.store.DeleteSessionRecord(session.ID)
	}
	h.clearCookie(w, sessionCookieName)
	respondJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *APIHandler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	session := h.sessionFromRequest(r)
	if session == nil || session.UserID == "" {
		respondAPIError(w, http.StatusUnauthorized, "auth_required", "You must be signed in to create a team.")
		return
	}

	plan := h.planForRequest(r, session)
	if !entitlementsForPlan(plan, h.usageForSession(session), h.billingAvailable()).Features.Teams {
		respondAPIError(w, http.StatusForbidden, "organization_not_available", "Team creation requires a Team or Enterprise plan.")
		return
	}

	workspace, err := h.workspaceForSession(session)
	if err != nil || workspace == nil {
		respondAPIError(w, http.StatusInternalServerError, "workspace_not_found", "Workspace not found.")
		return
	}
	if workspace.OrganizationID != "" {
		respondAPIError(w, http.StatusConflict, "organization_exists", "The current workspace already belongs to a team.")
		return
	}
	if workspace.OwnerUserID != session.UserID {
		respondAPIError(w, http.StatusForbidden, "organization_forbidden", "Only the workspace owner can turn this workspace into a team.")
		return
	}

	var req CreateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondAPIError(w, http.StatusBadRequest, "invalid_request", "Invalid request body.")
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		respondAPIError(w, http.StatusBadRequest, "invalid_name", "Organization name is required.")
		return
	}

	user, err := h.store.GetUserByID(session.UserID)
	if err != nil {
		respondAPIError(w, http.StatusInternalServerError, "user_lookup_failed", err.Error())
		return
	}

	now := time.Now()
	org := &Organization{
		ID:        newID("org"),
		Name:      sanitizeHTML(req.Name),
		Slug:      firstNonEmpty(strings.TrimSpace(req.Slug), fmt.Sprintf("%s-%s", slugify(req.Name), slugify(newID("org")[4:10]))),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := h.store.CreateOrganizationRecord(org); err != nil {
		respondAPIError(w, http.StatusInternalServerError, "organization_create_failed", err.Error())
		return
	}

	member := &OrganizationMember{
		ID:             newID("orgmem"),
		OrganizationID: org.ID,
		UserID:         session.UserID,
		Email:          user.Email,
		Role:           "owner",
		Status:         "active",
		JoinedAt:       now,
		CreatedAt:      now,
	}
	if err := h.store.CreateOrganizationMemberRecord(member); err != nil {
		respondAPIError(w, http.StatusInternalServerError, "organization_member_failed", err.Error())
		return
	}
	if err := h.ensureWorkspaceAttachedToOrganization(workspace, org); err != nil {
		respondAPIError(w, http.StatusInternalServerError, "workspace_attach_failed", err.Error())
		return
	}

	detail, err := h.buildOrganizationDetail(org.ID, session.UserID)
	if err != nil {
		respondAPIError(w, http.StatusInternalServerError, "organization_detail_failed", err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, detail)
}

func (h *APIHandler) AddOrganizationMember(w http.ResponseWriter, r *http.Request) {
	session := h.sessionFromRequest(r)
	if session == nil || session.UserID == "" {
		respondAPIError(w, http.StatusUnauthorized, "auth_required", "You must be signed in to invite organization members.")
		return
	}

	orgID := chi.URLParam(r, "orgId")
	if _, err := h.store.GetOrganizationRecord(orgID); err != nil {
		respondAPIError(w, http.StatusNotFound, "organization_not_found", "Organization not found.")
		return
	}
	currentMember, err := h.store.GetOrganizationMemberByUser(orgID, session.UserID)
	if err != nil || currentMember.Status != "active" || !canManageOrganizationMembers(currentMember.Role) {
		respondAPIError(w, http.StatusForbidden, "organization_forbidden", "Only team admins and owners can invite members.")
		return
	}

	var req AddOrganizationMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondAPIError(w, http.StatusBadRequest, "invalid_request", "Invalid request body.")
		return
	}

	email, err := normalizeEmail(req.Email)
	if err != nil {
		respondAPIError(w, http.StatusBadRequest, "invalid_email", err.Error())
		return
	}

	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = "read"
	}
	if !validOrganizationRole(role) || role == "owner" {
		respondAPIError(w, http.StatusBadRequest, "invalid_role", "Role must be read, edit, or admin.")
		return
	}

	now := time.Now()
	member := &OrganizationMember{
		ID:              newID("orgmem"),
		OrganizationID:  orgID,
		Email:           email,
		Role:            role,
		Status:          "invited",
		InviteToken:     newID("orginvite"),
		InviteExpiresAt: now.Add(organizationInviteTTL),
		CreatedAt:       now,
	}
	if err := h.store.UpsertOrganizationInvitation(member); err != nil {
		respondAPIError(w, http.StatusInternalServerError, "organization_member_failed", err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{"member": member})
}

func (h *APIHandler) BillingCheckout(w http.ResponseWriter, r *http.Request) {
	h.handleBillingCheckout(w, r)
}

func (h *APIHandler) BillingPortal(w http.ResponseWriter, r *http.Request) {
	h.handleBillingPortal(w, r)
}

func (h *APIHandler) BillingCheckoutSync(w http.ResponseWriter, r *http.Request) {
	h.handleBillingCheckoutSync(w, r)
}

func (h *APIHandler) BillingWebhook(w http.ResponseWriter, r *http.Request) {
	h.handleBillingWebhook(w, r)
}
