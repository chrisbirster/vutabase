import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Navigate, useNavigate} from "react-router";
import {PageContainer, PageSection, SurfacePanel} from "#/components/page-layout";
import {useAppRepository} from "#/lib/app-repository";
import type {UpdateWorkspacePlanRequest} from "#/lib/api";

const SALES_MAILTO = "mailto:sales@starter-template.example.com?subject=Starter%20Template%20Enterprise";

const planOptions: Array<{
  plan: UpdateWorkspacePlanRequest["plan"];
  title: string;
  price: string;
  description: string;
  bullets: string[];
}> = [
  {
    plan: "free",
    title: "Free",
    price: "$0",
    description: "Personal starter limits with OTP auth and a single workspace.",
    bullets: ["1 member", "1 workspace", "Great for initial builds"],
  },
  {
    plan: "pro",
    title: "Pro",
    price: "$12/mo",
    description: "More room for solo operators who want billing wired from day one.",
    bullets: ["Higher workspace allowance", "Stripe-ready billing flow", "Same starter stack"],
  },
  {
    plan: "team",
    title: "Team",
    price: "$8/user/mo",
    description: "Adds organization roles and a team-backed workspace.",
    bullets: ["Team roles", "Member invites", "Team billing support"],
  },
  {
    plan: "enterprise",
    title: "Enterprise",
    price: "Custom",
    description: "Placeholder for larger deployments and custom agreements.",
    bullets: ["Enterprise limits", "Manual sales flow", "Future custom rollout"],
  },
];

export function OnboardingPlanPage() {
  const repository = useAppRepository();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (plan: UpdateWorkspacePlanRequest["plan"]) => {
      if (plan === "enterprise") {
        throw new Error("Enterprise onboarding is handled manually. Update the placeholder sales email before launch.");
      }
      if (plan === "free") {
        const session = await repository.completeOnboardingPlan({plan});
        return {mode: "session" as const, session};
      }
      const response = await repository.startBillingCheckout({plan});
      return {mode: "billing" as const, response};
    },
    onSuccess: async (result) => {
      if (result.mode === "session") {
        queryClient.setQueryData(["auth-session"], result.session);
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ["auth-session"]}),
          queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
          queryClient.invalidateQueries({queryKey: ["me"]}),
        ]);
        navigate("/", {replace: true});
        return;
      }

      if (result.response.completed && result.response.session) {
        queryClient.setQueryData(["auth-session"], result.response.session);
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ["auth-session"]}),
          queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
          queryClient.invalidateQueries({queryKey: ["me"]}),
        ]);
        navigate("/", {replace: true});
        return;
      }

      if (result.response.checkoutUrl) {
        window.location.assign(result.response.checkoutUrl);
        return;
      }

      throw new Error("Billing checkout did not return a redirect URL.");
    },
  });

  if (sessionQuery.isLoading) {
    return (
      <PageContainer className="space-y-4">
        <PageSection className="p-5 text-sm text-[var(--app-text-soft)]">
          Loading onboarding...
        </PageSection>
      </PageContainer>
    );
  }

  if (!sessionQuery.data?.authenticated || !sessionQuery.data.user) {
    return <Navigate to="/login" replace />;
  }

  if (!sessionQuery.data.user.onboarding) {
    return <Navigate to="/" replace />;
  }

  const currentPlan = sessionQuery.data.entitlements.plan;

  return (
    <PageContainer className="space-y-6">
      <PageSection className="px-6 py-8 md:px-8 md:py-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--app-accent)]">
          Welcome
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
          Choose the plan that fits your starter project.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)] sm:text-base">
          The onboarding step seeds the starter workspace with the right billing and team posture.
          You can change plans later from the billing page.
        </p>
      </PageSection>

      <div className="grid gap-4 xl:grid-cols-4">
        {planOptions.map((option) => {
          const isCurrent = currentPlan === option.plan;
          return (
            <SurfacePanel
              key={option.plan}
              className={[
                "flex h-full flex-col",
                isCurrent ? "border-[var(--app-accent)] bg-[var(--app-surface-strong)]" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">{option.title}</p>
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

              <p className="mt-4 text-sm leading-6 text-[var(--app-text-soft)]">
                {option.description}
              </p>

              <ul className="mt-5 space-y-2 text-sm text-[var(--app-text-soft)]">
                {option.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 text-[var(--app-accent)]">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                {option.plan === "enterprise" ? (
                  <a
                    href={SALES_MAILTO}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-4 text-center text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-accent)]"
                  >
                    Contact sales
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectPlanMutation.mutate(option.plan)}
                    disabled={selectPlanMutation.isPending}
                    className={[
                      "inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-center text-sm font-semibold transition disabled:opacity-60",
                      isCurrent
                        ? "border border-[var(--app-line-strong)] bg-[var(--app-surface)] text-[var(--app-text)]"
                        : "bg-[var(--app-accent)] text-[var(--app-accent-ink)] hover:brightness-105",
                    ].join(" ")}
                  >
                    {selectPlanMutation.isPending && selectPlanMutation.variables === option.plan
                      ? "Working..."
                      : isCurrent
                        ? "Current plan"
                        : `Choose ${option.title}`}
                  </button>
                )}
              </div>
            </SurfacePanel>
          );
        })}
      </div>

      {selectPlanMutation.isError ? (
        <PageSection className="p-5 text-sm text-[var(--app-danger-text)]">
          {selectPlanMutation.error instanceof Error
            ? selectPlanMutation.error.message
            : "Failed to update the starter plan."}
        </PageSection>
      ) : null}
    </PageContainer>
  );
}
