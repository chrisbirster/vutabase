import type {ReactNode} from "react";
import {render} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router";
import {ThemeProvider} from "#/lib/theme";
import {AppRepositoryProvider, type AppRepository} from "#/lib/app-repository";
import type {AuthSessionResponse, BootstrapResponse} from "#/lib/api";

function baseEntitlements(plan: AuthSessionResponse["entitlements"]["plan"]) {
  return {
    plan,
    limits: {
      maxMembers: 1,
      maxWorkspaces: 1,
    },
    usage: {
      members: 1,
      workspaces: 1,
    },
    features: {
      otpAuth: true,
      billing: true,
      teams: true,
    },
  };
}

export const unauthenticatedSession: AuthSessionResponse = {
  authenticated: false,
  otpAuthEnabled: true,
  entitlements: baseEntitlements("guest"),
};

export const authenticatedSession: AuthSessionResponse = {
  authenticated: true,
  otpAuthEnabled: true,
  user: {
    id: "usr_1",
    email: "owner@starter-template.example.com",
    displayName: "Owner Example",
    onboarding: false,
    lastLoginAt: "2026-04-14T12:00:00Z",
    createdAt: "2026-04-10T12:00:00Z",
    updatedAt: "2026-04-14T12:00:00Z",
  },
  workspace: {
    id: "ws_1",
    name: "Starter Workspace",
    slug: "starter-workspace",
    ownerUserId: "usr_1",
    createdAt: "2026-04-10T12:00:00Z",
    updatedAt: "2026-04-14T12:00:00Z",
  },
  entitlements: {
    ...baseEntitlements("free"),
    limits: {
      maxMembers: 1,
      maxWorkspaces: 1,
    },
  },
  subscription: {
    id: "sub_1",
    plan: "free",
    status: "active",
    provider: "manual",
    billedQuantity: 1,
    createdAt: "2026-04-10T12:00:00Z",
    updatedAt: "2026-04-14T12:00:00Z",
  },
};

export const starterBootstrap: BootstrapResponse = {
  appName: "Starter Template",
  environment: "development",
  billingEnabled: true,
  origins: {
    app: "http://localhost:3000",
    marketing: "http://localhost:4173",
  },
  featureFlags: {
    otpAuth: true,
    billing: true,
    teams: true,
  },
  session: authenticatedSession,
};

export function makeRepository(overrides: Partial<AppRepository> = {}): AppRepository {
  return {
    healthCheck: async () => ({status: "ok", service: "starter-api", version: "test"}),
    fetchBootstrap: async () => starterBootstrap,
    fetchSession: async () => authenticatedSession,
    fetchMe: async () => authenticatedSession,
    requestOTP: async () => ({
      ok: true,
      expiresAt: "2026-04-14T12:10:00Z",
      retryAfterSeconds: 60,
      delivery: "dev-inline",
      devCode: "123456",
    }),
    verifyOTP: async () => authenticatedSession,
    logout: async () => ({ok: true}),
    completeOnboardingPlan: async () => authenticatedSession,
    startBillingCheckout: async () => ({
      provider: "manual",
      plan: "pro",
      completed: true,
      session: authenticatedSession,
      subscription: authenticatedSession.subscription,
    }),
    openBillingPortal: async () => ({provider: "manual", url: "https://billing.starter-template.example.com"}),
    syncBillingCheckoutSession: async () => ({
      provider: "manual",
      completed: true,
      session: authenticatedSession,
      subscription: authenticatedSession.subscription,
    }),
    createOrganization: async () => ({
      organization: {
        id: "org_1",
        name: "Starter Team",
        slug: "starter-team",
        createdAt: "2026-04-14T12:00:00Z",
        updatedAt: "2026-04-14T12:00:00Z",
      },
      workspace: authenticatedSession.workspace,
      subscription: authenticatedSession.subscription,
      membership: {
        id: "orgmem_1",
        organizationId: "org_1",
        userId: "usr_1",
        email: "owner@starter-template.example.com",
        role: "owner",
        status: "active",
        joinedAt: "2026-04-14T12:00:00Z",
        createdAt: "2026-04-14T12:00:00Z",
      },
      members: [],
      canManagePlan: true,
      canManageMembers: true,
      canEdit: true,
    }),
    fetchOrganization: async () => ({
      organization: {
        id: "org_1",
        name: "Starter Team",
        slug: "starter-team",
        createdAt: "2026-04-14T12:00:00Z",
        updatedAt: "2026-04-14T12:00:00Z",
      },
      workspace: {
        ...authenticatedSession.workspace!,
        organizationId: "org_1",
      },
      subscription: {
        ...authenticatedSession.subscription!,
        plan: "team",
      },
      membership: {
        id: "orgmem_1",
        organizationId: "org_1",
        userId: "usr_1",
        email: "owner@starter-template.example.com",
        role: "owner",
        status: "active",
        joinedAt: "2026-04-14T12:00:00Z",
        createdAt: "2026-04-14T12:00:00Z",
      },
      members: [
        {
          id: "orgmem_1",
          organizationId: "org_1",
          userId: "usr_1",
          email: "owner@starter-template.example.com",
          role: "owner",
          status: "active",
          joinedAt: "2026-04-14T12:00:00Z",
          createdAt: "2026-04-14T12:00:00Z",
        },
      ],
      canManagePlan: true,
      canManageMembers: true,
      canEdit: true,
    }),
    addOrganizationMember: async () => ({
      member: {
        id: "orgmem_2",
        organizationId: "org_1",
        email: "member@starter-template.example.com",
        role: "read",
        status: "invited",
        createdAt: "2026-04-14T12:00:00Z",
      },
    }),
    updateOrganization: async () => makeRepository().fetchOrganization("org_1"),
    deleteOrganization: async () => undefined,
    updateOrganizationMember: async () => ({
      member: {
        id: "orgmem_2",
        organizationId: "org_1",
        email: "member@starter-template.example.com",
        role: "admin",
        status: "active",
        createdAt: "2026-04-14T12:00:00Z",
      },
    }),
    deleteOrganizationMember: async () => undefined,
    joinOrganization: async () => makeRepository().fetchOrganization("org_1"),
    updateWorkspacePlan: async () => authenticatedSession,
    ...overrides,
  };
}

export function renderWithStarter(
  ui: ReactNode,
  {route = "/", repository = makeRepository()}: {route?: string; repository?: AppRepository} = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <ThemeProvider>
      <AppRepositoryProvider repository={repository}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </QueryClientProvider>
      </AppRepositoryProvider>
    </ThemeProvider>,
  );
}
