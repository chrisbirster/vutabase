import {createContext, useContext, type ReactNode} from "react";
import {
  addOrganizationMember,
  completeOnboardingPlan,
  createOrganization,
  deleteOrganization,
  deleteOrganizationMember,
  fetchBootstrap,
  fetchMe,
  fetchOrganization,
  fetchSession,
  healthCheck,
  joinOrganization,
  logout,
  openBillingPortal,
  requestOTP,
  startBillingCheckout,
  syncBillingCheckoutSession,
  updateOrganization,
  updateOrganizationMember,
  updateWorkspacePlan,
  verifyOTP,
  type AddOrganizationMemberRequest,
  type AuthSessionResponse,
  type BillingCheckoutResponse,
  type BillingCheckoutSyncResponse,
  type BillingPortalResponse,
  type BootstrapResponse,
  type CreateOrganizationRequest,
  type JoinOrganizationRequest,
  type OrganizationDetail,
  type OTPRequestResponse,
  type UpdateOrganizationMemberRequest,
  type UpdateOrganizationRequest,
  type UpdateWorkspacePlanRequest,
} from "#/lib/api";

export interface AppRepository {
  healthCheck(): Promise<{status: string; service: string; version: string}>;
  fetchBootstrap(): Promise<BootstrapResponse>;
  fetchSession(): Promise<AuthSessionResponse>;
  fetchMe(): Promise<AuthSessionResponse>;
  requestOTP(email: string): Promise<OTPRequestResponse>;
  verifyOTP(email: string, code: string): Promise<AuthSessionResponse>;
  logout(): Promise<{ok: boolean}>;
  completeOnboardingPlan(
    req: UpdateWorkspacePlanRequest,
  ): Promise<AuthSessionResponse>;
  startBillingCheckout(req: {
    plan: UpdateWorkspacePlanRequest["plan"];
  }): Promise<BillingCheckoutResponse>;
  openBillingPortal(req?: {
    plan?: UpdateWorkspacePlanRequest["plan"];
  }): Promise<BillingPortalResponse>;
  syncBillingCheckoutSession(
    sessionId: string,
  ): Promise<BillingCheckoutSyncResponse>;
  createOrganization(req: CreateOrganizationRequest): Promise<OrganizationDetail>;
  fetchOrganization(orgId: string): Promise<OrganizationDetail>;
  addOrganizationMember(
    orgId: string,
    req: AddOrganizationMemberRequest,
  ): Promise<{member: OrganizationDetail["membership"]}>;
  updateOrganization(
    orgId: string,
    req: UpdateOrganizationRequest,
  ): Promise<OrganizationDetail>;
  deleteOrganization(orgId: string): Promise<void>;
  updateOrganizationMember(
    orgId: string,
    memberId: string,
    req: UpdateOrganizationMemberRequest,
  ): Promise<{member: OrganizationDetail["membership"]}>;
  deleteOrganizationMember(orgId: string, memberId: string): Promise<void>;
  joinOrganization(req: JoinOrganizationRequest): Promise<OrganizationDetail>;
  updateWorkspacePlan(
    workspaceId: string,
    req: UpdateWorkspacePlanRequest,
  ): Promise<AuthSessionResponse>;
}

const defaultRepository: AppRepository = {
  healthCheck,
  fetchBootstrap,
  fetchSession,
  fetchMe,
  requestOTP,
  verifyOTP,
  logout,
  completeOnboardingPlan,
  startBillingCheckout,
  openBillingPortal,
  syncBillingCheckoutSession,
  createOrganization,
  fetchOrganization,
  addOrganizationMember,
  updateOrganization,
  deleteOrganization,
  updateOrganizationMember,
  deleteOrganizationMember,
  joinOrganization,
  updateWorkspacePlan,
};

const AppRepositoryContext = createContext<AppRepository | null>(null);

export function AppRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode;
  repository?: AppRepository;
}) {
  return (
    <AppRepositoryContext.Provider value={repository}>
      {children}
    </AppRepositoryContext.Provider>
  );
}

export function useAppRepository() {
  const repository = useContext(AppRepositoryContext);
  if (!repository) {
    throw new Error("useAppRepository must be used within AppRepositoryProvider");
  }
  return repository;
}
