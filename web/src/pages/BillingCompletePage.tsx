import {useEffect} from "react";
import {Link, useNavigate, useSearchParams} from "react-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {EmptyState, PageContainer, PageSection} from "#/components/page-layout";
import {useAppRepository} from "#/lib/app-repository";

export function BillingCompletePage() {
  const repository = useAppRepository();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("checkout_session_id")?.trim() ?? "";

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  const syncMutation = useMutation({
    mutationFn: (sessionId: string) => repository.syncBillingCheckoutSession(sessionId),
    onSuccess: async (payload) => {
      if (payload.session) {
        queryClient.setQueryData(["auth-session"], payload.session);
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ["auth-session"]}),
        queryClient.invalidateQueries({queryKey: ["me"]}),
        queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
        queryClient.invalidateQueries({queryKey: ["organization"]}),
      ]);

      const nextSession = payload.session;
      if (!nextSession?.user?.onboarding) {
        navigate("/billing?checkout=success", {replace: true});
      }
    },
  });

  useEffect(() => {
    if (checkoutState === "success" && checkoutSessionId && syncMutation.isIdle) {
      syncMutation.mutate(checkoutSessionId);
    }
  }, [checkoutSessionId, checkoutState, syncMutation]);

  if (sessionQuery.isLoading) {
    return (
      <PageContainer className="space-y-4">
        <PageSection className="p-5 text-sm text-[var(--app-text-soft)]">
          Loading billing status...
        </PageSection>
      </PageContainer>
    );
  }

  if (!sessionQuery.data?.authenticated) {
    return (
      <PageContainer className="space-y-4">
        <EmptyState
          title="Sign in required"
          description="Sign in again to finish syncing the billing change for this workspace."
          action={
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)]"
            >
              Go to login
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (checkoutState === "cancelled") {
    return (
      <PageContainer className="space-y-4">
        <EmptyState
          title="Checkout canceled"
          description="No billing change was applied. You can return to the billing page whenever you're ready."
          action={
            <Link
              to="/billing"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)]"
            >
              Return to billing
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (checkoutState !== "success" || !checkoutSessionId) {
    return (
      <PageContainer className="space-y-4">
        <EmptyState
          title="Billing return link is incomplete"
          description="We couldn't find a Stripe checkout session to sync. Head back to billing and try again."
          action={
            <Link
              to="/billing"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)]"
            >
              Open billing
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <PageSection className="p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--app-accent)]">
          Billing
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
          {syncMutation.isSuccess && syncMutation.data.completed
            ? "Billing updated"
            : "Syncing your billing change"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-text-soft)]">
          We&apos;re syncing the Stripe checkout result back into the starter workspace so plan state and
          team entitlements stay aligned.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => syncMutation.mutate(checkoutSessionId)}
            disabled={syncMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)] disabled:opacity-60"
          >
            {syncMutation.isPending ? "Syncing..." : "Sync billing now"}
          </button>
          <Link
            to="/billing"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-5 text-sm font-medium text-[var(--app-text)]"
          >
            Back to billing
          </Link>
        </div>
        {syncMutation.isError ? (
          <p className="mt-4 text-sm text-[var(--app-danger-text)]">
            {syncMutation.error instanceof Error
              ? syncMutation.error.message
              : "Failed to sync the billing checkout."}
          </p>
        ) : null}
      </PageSection>
    </PageContainer>
  );
}
