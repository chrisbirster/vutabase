package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"testing/fstest"
)

type testServer struct {
	cfg    AppConfig
	store  *SQLiteStore
	server *httptest.Server
	client *http.Client
}

func newStarterTestServer(t *testing.T) *testServer {
	t.Helper()

	store, err := OpenStore(DatabaseConfig{
		Mode: DatabaseModeSQLite,
		Path: filepath.Join(t.TempDir(), "starter-test.db"),
	})
	if err != nil {
		t.Fatalf("OpenStore returned error: %v", err)
	}

	cfg := mustLocalAppConfig()
	cfg.AppName = "Starter Template"
	cfg.AppOrigin = "http://localhost:3000"
	cfg.MarketingOrigin = "http://localhost:4173"
	cfg.Cookie.Domain = ""
	cfg.Cookie.Secure = false
	cfg.AuthSuccessPath = "/"

	handler := NewAPIHandlerWithConfig(store, cfg, LogEmailSender{})
	server := httptest.NewServer(NewServer(cfg, handler, fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("<!doctype html><html><body>starter</body></html>")},
	}))

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookiejar.New returned error: %v", err)
	}

	return &testServer{
		cfg:   cfg,
		store: store,
		server: server,
		client: &http.Client{
			Jar: jar,
		},
	}
}

func (ts *testServer) close() {
	ts.server.Close()
	_ = ts.store.Close()
}

func (ts *testServer) postJSON(t *testing.T, path string, body any) *http.Response {
	t.Helper()

	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("json.Marshal returned error: %v", err)
	}
	req, err := http.NewRequest(http.MethodPost, ts.server.URL+path, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("http.NewRequest returned error: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := ts.client.Do(req)
	if err != nil {
		t.Fatalf("client.Do returned error: %v", err)
	}
	return resp
}

func (ts *testServer) get(t *testing.T, path string) *http.Response {
	t.Helper()

	req, err := http.NewRequest(http.MethodGet, ts.server.URL+path, nil)
	if err != nil {
		t.Fatalf("http.NewRequest returned error: %v", err)
	}
	resp, err := ts.client.Do(req)
	if err != nil {
		t.Fatalf("client.Do returned error: %v", err)
	}
	return resp
}

func decodeJSON[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	defer resp.Body.Close()

	var value T
	if err := json.NewDecoder(resp.Body).Decode(&value); err != nil {
		t.Fatalf("json decode failed: %v", err)
	}
	return value
}

func TestOTPBootstrapMeAndLogoutFlow(t *testing.T) {
	ts := newStarterTestServer(t)
	defer ts.close()

	bootstrapBefore := decodeJSON[BootstrapResponse](t, ts.get(t, "/api/bootstrap"))
	if bootstrapBefore.Session != nil {
		t.Fatalf("expected unauthenticated bootstrap to omit session")
	}
	if bootstrapBefore.AppName != "Starter Template" {
		t.Fatalf("expected starter app name, got %q", bootstrapBefore.AppName)
	}

	otpResponse := decodeJSON[struct {
		OK      bool   `json:"ok"`
		DevCode string `json:"devCode"`
	}](t, ts.postJSON(t, "/api/auth/request-otp", map[string]string{
		"email": "owner@starter-template.example.com",
	}))
	if !otpResponse.OK || otpResponse.DevCode == "" {
		t.Fatalf("expected development OTP response with inline code, got %+v", otpResponse)
	}

	session := decodeJSON[AuthSessionResponse](t, ts.postJSON(t, "/api/auth/verify-otp", map[string]string{
		"email": "owner@starter-template.example.com",
		"code":  otpResponse.DevCode,
	}))
	if !session.Authenticated {
		t.Fatalf("expected authenticated session after OTP verification")
	}
	if session.User == nil || session.User.Email != "owner@starter-template.example.com" {
		t.Fatalf("expected authenticated user payload, got %+v", session.User)
	}
	if session.Workspace == nil || session.Workspace.Name == "" {
		t.Fatalf("expected default workspace in session payload")
	}

	sessionLookup := decodeJSON[AuthSessionResponse](t, ts.get(t, "/api/auth/session"))
	if !sessionLookup.Authenticated {
		t.Fatalf("expected auth/session to reflect signed-in state")
	}

	me := decodeJSON[AuthSessionResponse](t, ts.get(t, "/api/me"))
	if me.User == nil || me.Workspace == nil {
		t.Fatalf("expected /api/me to include user and workspace")
	}

	bootstrapAfter := decodeJSON[BootstrapResponse](t, ts.get(t, "/api/bootstrap"))
	if bootstrapAfter.Session == nil || !bootstrapAfter.Session.Authenticated {
		t.Fatalf("expected authenticated bootstrap session")
	}
	if bootstrapAfter.Origins.App != "http://localhost:3000" {
		t.Fatalf("expected app origin in bootstrap, got %q", bootstrapAfter.Origins.App)
	}

	logout := decodeJSON[map[string]bool](t, ts.postJSON(t, "/api/auth/logout", map[string]string{}))
	if !logout["ok"] {
		t.Fatalf("expected logout ok response")
	}

	sessionAfterLogout := decodeJSON[AuthSessionResponse](t, ts.get(t, "/api/auth/session"))
	if sessionAfterLogout.Authenticated {
		t.Fatalf("expected session to be cleared after logout")
	}
}

func TestTeamOnboardingCreatesOrganizationContext(t *testing.T) {
	ts := newStarterTestServer(t)
	defer ts.close()

	otpResponse := decodeJSON[struct {
		DevCode string `json:"devCode"`
	}](t, ts.postJSON(t, "/api/auth/request-otp", map[string]string{
		"email": "owner@starter-template.example.com",
	}))
	_ = decodeJSON[AuthSessionResponse](t, ts.postJSON(t, "/api/auth/verify-otp", map[string]string{
		"email": "owner@starter-template.example.com",
		"code":  otpResponse.DevCode,
	}))

	session := decodeJSON[AuthSessionResponse](t, ts.postJSON(t, "/api/onboarding/plan", map[string]string{
		"plan": "team",
	}))
	if session.Organization == nil {
		t.Fatalf("expected team onboarding to create an organization")
	}
	if session.OrganizationMember == nil || session.OrganizationMember.Role != "owner" {
		t.Fatalf("expected team onboarding to create an owner membership")
	}
	if session.Workspace == nil || session.Workspace.OrganizationID == "" {
		t.Fatalf("expected workspace to attach to the organization")
	}
	if session.Subscription == nil || session.Subscription.Plan != PlanTeam {
		t.Fatalf("expected team subscription after onboarding, got %+v", session.Subscription)
	}

	orgDetail := decodeJSON[OrganizationDetail](t, ts.get(t, "/api/orgs/"+session.Organization.ID))
	if orgDetail.Organization.ID != session.Organization.ID {
		t.Fatalf("expected fetched organization detail for %q, got %q", session.Organization.ID, orgDetail.Organization.ID)
	}
	if len(orgDetail.Members) != 1 {
		t.Fatalf("expected one starter organization member, got %d", len(orgDetail.Members))
	}
}
