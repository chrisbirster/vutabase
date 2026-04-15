const API_BASE = (import.meta.env.APP_API_BASE ?? "/api").replace(/\/$/, "");

export type Plan = "guest" | "free" | "pro" | "team" | "enterprise";

export class APIError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }
}

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
  });

  if (!res.ok) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.assign("/login");
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = (await res.json().catch(() => null)) as {
        message?: string;
        code?: string;
      } | null;
      throw new APIError(
        payload?.message || "Request failed",
        res.status,
        payload?.code,
      );
    }
    throw new APIError((await res.text()) || "Request failed", res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export interface PlanLimits {
  maxMembers: number;
  maxWorkspaces: number;
}

export interface EntitlementUsage {
  members: number;
  workspaces: number;
}

export interface EntitlementFeatures {
  otpAuth: boolean;
  billing: boolean;
  teams: boolean;
}

export interface Entitlements {
  plan: Plan;
  limits: PlanLimits;
  usage: EntitlementUsage;
  features: EntitlementFeatures;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  onboarding: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerUserId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId?: string;
  email: string;
  role: "read" | "edit" | "admin" | "owner";
  status: "invited" | "active" | "removed" | "declined" | "expired";
  inviteToken?: string;
  inviteExpiresAt?: string;
  joinedAt?: string;
  removedAt?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  workspaceId?: string;
  organizationId?: string;
  plan: Plan;
  scheduledPlan?: Plan;
  status: string;
  provider?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerSubscriptionItemId?: string;
  providerCheckoutSessionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  billedQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  otpAuthEnabled: boolean;
  user?: User;
  workspace?: Workspace;
  organization?: Organization;
  organizationMember?: OrganizationMember;
  subscription?: Subscription;
  entitlements: Entitlements;
}

export interface BootstrapResponse {
  appName: string;
  environment: string;
  billingEnabled: boolean;
  origins: {
    app: string;
    marketing: string;
  };
  featureFlags: {
    otpAuth: boolean;
    billing: boolean;
    teams: boolean;
  };
  session?: AuthSessionResponse;
}

export interface OTPRequestResponse {
  ok: boolean;
  expiresAt: string;
  retryAfterSeconds: number;
  delivery: string;
  devCode?: string;
}

export interface OrganizationDetail {
  organization: Organization;
  workspace?: Workspace;
  subscription?: Subscription;
  membership: OrganizationMember;
  members: OrganizationMember[];
  canManagePlan: boolean;
  canManageMembers: boolean;
  canEdit: boolean;
}

export interface UpdateWorkspacePlanRequest {
  plan: Plan;
}

export interface BillingCheckoutResponse {
  provider: string;
  plan: Plan;
  checkoutUrl?: string;
  completed: boolean;
  message?: string;
  session?: AuthSessionResponse;
  subscription?: Subscription;
}

export interface BillingPortalResponse {
  provider: string;
  url: string;
  message?: string;
}

export interface BillingCheckoutSyncResponse {
  provider: string;
  completed: boolean;
  message?: string;
  session?: AuthSessionResponse;
  subscription?: Subscription;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface AddOrganizationMemberRequest {
  email: string;
  role: OrganizationMember["role"];
}

export interface UpdateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface UpdateOrganizationMemberRequest {
  role?: OrganizationMember["role"];
  status?: OrganizationMember["status"];
}

export interface JoinOrganizationRequest {
  token: string;
}

export function healthCheck(): Promise<{
  status: string;
  service: string;
  version: string;
}> {
  return requestJSON("/health");
}

export function fetchBootstrap(): Promise<BootstrapResponse> {
  return requestJSON("/bootstrap");
}

export function fetchSession(): Promise<AuthSessionResponse> {
  return requestJSON("/auth/session");
}

export function requestOTP(email: string): Promise<OTPRequestResponse> {
  return requestJSON("/auth/request-otp", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email}),
  });
}

export function verifyOTP(
  email: string,
  code: string,
): Promise<AuthSessionResponse> {
  return requestJSON("/auth/verify-otp", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, code}),
  });
}

export function logout(): Promise<{ok: boolean}> {
  return requestJSON("/auth/logout", {
    method: "POST",
  });
}

export function fetchMe(): Promise<AuthSessionResponse> {
  return requestJSON("/me");
}

export function completeOnboardingPlan(
  req: UpdateWorkspacePlanRequest,
): Promise<AuthSessionResponse> {
  return requestJSON("/onboarding/plan", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}

export function startBillingCheckout(req: {
  plan: UpdateWorkspacePlanRequest["plan"];
}): Promise<BillingCheckoutResponse> {
  return requestJSON("/billing/checkout", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}

export function openBillingPortal(req?: {
  plan?: UpdateWorkspacePlanRequest["plan"];
}): Promise<BillingPortalResponse> {
  return requestJSON("/billing/portal", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req ?? {}),
  });
}

export function syncBillingCheckoutSession(
  sessionId: string,
): Promise<BillingCheckoutSyncResponse> {
  return requestJSON(`/billing/checkout/sessions/${encodeURIComponent(sessionId)}/sync`, {
    method: "POST",
  });
}

export function createOrganization(
  req: CreateOrganizationRequest,
): Promise<OrganizationDetail> {
  return requestJSON("/orgs", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}

export function fetchOrganization(orgId: string): Promise<OrganizationDetail> {
  return requestJSON(`/orgs/${encodeURIComponent(orgId)}`);
}

export function addOrganizationMember(
  orgId: string,
  req: AddOrganizationMemberRequest,
): Promise<{member: OrganizationMember}> {
  return requestJSON(`/orgs/${encodeURIComponent(orgId)}/members`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}

export function updateOrganization(
  orgId: string,
  req: UpdateOrganizationRequest,
): Promise<OrganizationDetail> {
  return requestJSON(`/orgs/${encodeURIComponent(orgId)}`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}

export function deleteOrganization(orgId: string): Promise<void> {
  return requestJSON(`/orgs/${encodeURIComponent(orgId)}`, {
    method: "DELETE",
  });
}

export function updateOrganizationMember(
  orgId: string,
  memberId: string,
  req: UpdateOrganizationMemberRequest,
): Promise<{member: OrganizationMember}> {
  return requestJSON(
    `/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(req),
    },
  );
}

export function deleteOrganizationMember(
  orgId: string,
  memberId: string,
): Promise<void> {
  return requestJSON(
    `/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
    },
  );
}

export function joinOrganization(
  req: JoinOrganizationRequest,
): Promise<OrganizationDetail> {
  return requestJSON("/orgs/join", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}

export function updateWorkspacePlan(
  workspaceId: string,
  req: UpdateWorkspacePlanRequest,
): Promise<AuthSessionResponse> {
  return requestJSON(`/workspaces/${encodeURIComponent(workspaceId)}/plan`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req),
  });
}
