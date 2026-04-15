import {useQuery} from "@tanstack/react-query";
import {
  EmptyState,
  PageContainer,
  PageSection,
  StatPanel,
  SurfacePanel,
} from "#/components/page-layout";
import {useAppRepository} from "#/lib/app-repository";

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export function HomePage() {
  const repository = useAppRepository();
  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => repository.fetchBootstrap(),
  });
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => repository.fetchMe(),
  });

  if (bootstrapQuery.isLoading || meQuery.isLoading) {
    return (
      <PageContainer className="space-y-4">
        <PageSection className="p-6 text-sm text-[var(--app-text-soft)]">
          Loading starter workspace...
        </PageSection>
      </PageContainer>
    );
  }

  if (bootstrapQuery.isError || meQuery.isError || !meQuery.data?.authenticated) {
    return (
      <PageContainer className="space-y-4">
        <EmptyState
          title="Starter data unavailable"
          description="We couldn't load the bootstrap payload for this session."
        />
      </PageContainer>
    );
  }

  const bootstrap = bootstrapQuery.data!;
  const session = meQuery.data!;

  return (
    <PageContainer className="space-y-6">
      <PageSection className="px-6 py-8 sm:px-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--app-accent)]">
          Starter Dashboard
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
          This repository is ready to be renamed into your next product.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)] sm:text-base">
          The backend, app shell, marketing site, Fly deploy, SST email flow, and Stripe hooks are all
          wired as reusable infrastructure. What&apos;s intentionally missing now is product-specific domain logic.
        </p>
      </PageSection>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatPanel
          label="Plan"
          value={session.entitlements.plan.toUpperCase()}
          detail="Plan state comes from the retained billing and entitlement surface."
        />
        <StatPanel
          label="Workspace"
          value={session.workspace?.name || "Unknown"}
          detail="Personal and team workspaces remain as the generic SaaS anchor."
        />
        <StatPanel
          label="Billing"
          value={bootstrap.billingEnabled ? "Enabled" : "Disabled"}
          detail="Stripe-backed billing stays available for starter projects."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Current session</p>
          <dl className="mt-4 grid gap-3 text-sm text-[var(--app-text-soft)]">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">User</dt>
              <dd className="mt-1 text-[var(--app-text)]">
                {session.user?.displayName} · {session.user?.email}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Last login</dt>
              <dd className="mt-1 text-[var(--app-text)]">{formatDate(session.user?.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Marketing origin</dt>
              <dd className="mt-1 text-[var(--app-text)]">{bootstrap.origins.marketing}</dd>
            </div>
          </dl>
        </SurfacePanel>

        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Template placeholders</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-muted-surface)] p-4">
              <p className="font-medium text-[var(--app-text)]">Starter resource area</p>
              <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">
                Replace this with your first real product dashboard, index view, or admin surface.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-muted-surface)] p-4">
              <p className="font-medium text-[var(--app-text)]">Feature-flagged expansion point</p>
              <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">
                Billing, OTP auth, and teams are preserved so you can build on them without redoing infra.
              </p>
            </div>
          </div>
        </SurfacePanel>
      </section>
    </PageContainer>
  );
}
