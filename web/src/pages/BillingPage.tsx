import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {PageContainer, PageSection, SurfacePanel} from "#/components/page-layout";
import {useAppRepository} from "#/lib/app-repository";
import type {UpdateWorkspacePlanRequest} from "#/lib/api";

const SALES_MAILTO = "mailto:sales@starter-template.example.com?subject=Starter%20Template%20Enterprise";

const planOptions: Array<{
  plan: UpdateWorkspacePlanRequest["plan"];
  label: string;
  description: string;
  price: string;
}> = [
  {plan: "free", label: "Free", description: "Personal starter limits.", price: "$0"},
  {plan: "pro", label: "Pro", description: "More room for solo operators.", price: "$12/mo"},
  {plan: "team", label: "Team", description: "Team roles and shared billing.", price: "$8/user/mo"},
  {plan: "enterprise", label: "Enterprise", description: "Custom agreements.", price: "Custom"},
];

export function BillingPage() {
  const repository = useAppRepository();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: UpdateWorkspacePlanRequest["plan"]) => {
      const session = sessionQuery.data!;
      const currentPlan = session.entitlements.plan;
      const provider = session.subscription?.provider ?? "";

      if (plan === "enterprise") {
        window.location.assign(SALES_MAILTO);
        return {mode: "external" as const};
      }

      if (provider === "manual") {
        const nextSession = await repository.updateWorkspacePlan(session.workspace!.id, {plan});
        return {mode: "session" as const, session: nextSession};
      }

      if (currentPlan === "free" || currentPlan === "guest") {
        const response = await repository.startBillingCheckout({plan});
        return {mode: "checkout" as const, response};
      }

      const response = await repository.openBillingPortal({plan});
      return {mode: "portal" as const, response};
    },
    onSuccess: async (result) => {
      if (result.mode === "session") {
        queryClient.setQueryData(["auth-session"], result.session);
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ["auth-session"]}),
          queryClient.invalidateQueries({queryKey: ["me"]}),
          queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
        ]);
        return;
      }

      if (result.mode === "checkout") {
        if (result.response.completed && result.response.session) {
          queryClient.setQueryData(["auth-session"], result.response.session);
          await Promise.all([
            queryClient.invalidateQueries({queryKey: ["auth-session"]}),
            queryClient.invalidateQueries({queryKey: ["me"]}),
            queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
          ]);
          return;
        }
        if (result.response.checkoutUrl) {
          window.location.assign(result.response.checkoutUrl);
          return;
        }
        throw new Error("Billing checkout did not return a redirect URL.");
      }

      if (result.mode === "portal") {
        window.location.assign(result.response.url);
      }
    },
  });

  const billingPortalMutation = useMutation({
    mutationFn: () => repository.openBillingPortal(),
    onSuccess: (result) => {
      window.location.assign(result.url);
    },
  });

  if (sessionQuery.isLoading || !sessionQuery.data?.authenticated || !sessionQuery.data.user) {
    return (
      <PageContainer className="space-y-4">
        <PageSection className="p-5 text-sm text-[var(--app-text-soft)]">
          Loading billing...
        </PageSection>
      </PageContainer>
    );
  }

  const session = sessionQuery.data;
  const user = session.user!;
  const currentPlan = session.entitlements.plan;
  const subscription = session.subscription;
  const organizationRole = session.organizationMember?.role;
  const canManagePlan = session.workspace?.organizationId
    ? organizationRole === "admin" || organizationRole === "owner"
    : session.workspace?.ownerUserId === user.id;
  const canOpenBillingPortal =
    canManagePlan &&
    subscription?.provider === "stripe" &&
    Boolean(subscription?.providerCustomerId);

  return (
    <PageContainer className="space-y-6">
      <PageSection className="px-6 py-8 md:px-8 md:py-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--app-accent)]">
          Billing
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
          Manage plans and Stripe flows without rebuilding the starter plumbing.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)] sm:text-base">
          Keep this page as-is for a generic SaaS starter, or replace it with your product&apos;s own pricing and billing UX.
        </p>
      </PageSection>

      <section className="grid gap-4 xl:grid-cols-4">
        {planOptions.map((option) => {
          const isCurrent = currentPlan === option.plan;
          return (
            <SurfacePanel
              key={option.plan}
              className={isCurrent ? "border-[var(--app-accent)] bg-[var(--app-surface-strong)]" : ""}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">{option.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-text)]">
                    {option.price}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="rounded-full bg-[var(--app-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--app-accent-ink)]">
                    Current
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--app-text-soft)]">{option.description}</p>
              {canManagePlan ? (
                <button
                  type="button"
                  onClick={() => updatePlanMutation.mutate(option.plan)}
                  disabled={updatePlanMutation.isPending || isCurrent}
                  className={[
                    "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:opacity-60",
                    isCurrent
                      ? "border border-[var(--app-line-strong)] bg-[var(--app-surface)] text-[var(--app-text)]"
                      : "bg-[var(--app-accent)] text-[var(--app-accent-ink)] hover:brightness-105",
                  ].join(" ")}
                >
                  {isCurrent ? "Current plan" : `Choose ${option.label}`}
                </button>
              ) : null}
            </SurfacePanel>
          );
        })}
      </section>

      <SurfacePanel>
        <p className="text-sm font-semibold text-[var(--app-text)]">Subscription status</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-muted-surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Provider</p>
            <p className="mt-1 text-sm font-medium text-[var(--app-text)]">
              {subscription?.provider || "manual"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-muted-surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Status</p>
            <p className="mt-1 text-sm font-medium text-[var(--app-text)]">
              {subscription?.status || "active"}
            </p>
          </div>
        </div>
        {canOpenBillingPortal ? (
          <button
            type="button"
            onClick={() => billingPortalMutation.mutate()}
            disabled={billingPortalMutation.isPending}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-5 text-sm font-medium text-[var(--app-text)] disabled:opacity-60"
          >
            {billingPortalMutation.isPending ? "Opening portal..." : "Open billing portal"}
          </button>
        ) : null}
      </SurfacePanel>

      {updatePlanMutation.isError ? (
        <PageSection className="p-5 text-sm text-[var(--app-danger-text)]">
          {updatePlanMutation.error instanceof Error
            ? updatePlanMutation.error.message
            : "Failed to update the plan."}
        </PageSection>
      ) : null}
    </PageContainer>
  );
}
