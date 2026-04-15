import {Link} from "react-router";
import {useQuery} from "@tanstack/react-query";
import {EmptyState, PageContainer, PageSection, SurfacePanel} from "#/components/page-layout";
import {useAppRepository} from "#/lib/app-repository";

function SettingsRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex flex-col gap-1 rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-muted-surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">
        {label}
      </p>
      <p className="text-sm font-medium text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

export function SettingsPage() {
  const repository = useAppRepository();
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  if (sessionQuery.isLoading) {
    return (
      <PageContainer className="space-y-4">
        <PageSection className="p-5 text-sm text-[var(--app-text-soft)]">
          Loading settings...
        </PageSection>
      </PageContainer>
    );
  }

  if (!sessionQuery.data?.authenticated || !sessionQuery.data.user) {
    return (
      <PageContainer className="space-y-4">
        <EmptyState
          title="Settings unavailable"
          description="Sign in to manage your profile, workspace, and billing context."
        />
      </PageContainer>
    );
  }

  const session = sessionQuery.data;
  const user = session.user!;

  return (
    <PageContainer className="space-y-6">
      <PageSection className="px-6 py-8 md:px-8 md:py-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--app-accent)]">
          Settings
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
          Manage your account defaults and starter infrastructure settings.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)] sm:text-base">
          This page keeps the personal settings surface generic. Billing and team administration are
          broken out into dedicated routes so you can swap in your project&apos;s real product settings later.
        </p>
      </PageSection>

      <section className="grid gap-6 lg:grid-cols-2">
        <PageSection className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--app-text)]">Profile</h2>
          <div className="mt-5 grid gap-3">
            <SettingsRow label="Display name" value={user.displayName} />
            <SettingsRow label="Email" value={user.email} />
            <SettingsRow label="Last login" value={formatDate(user.lastLoginAt)} />
          </div>
        </PageSection>

        <PageSection className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--app-text)]">Workspace</h2>
          <div className="mt-5 grid gap-3">
            <SettingsRow
              label="Workspace name"
              value={session.workspace?.name || "Unknown workspace"}
            />
            <SettingsRow label="Plan" value={session.entitlements.plan.toUpperCase()} />
            <SettingsRow
              label="Team"
              value={session.organization?.name || "Personal workspace"}
            />
          </div>
        </PageSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Billing</p>
          <p className="mt-3 text-sm leading-6 text-[var(--app-text-soft)]">
            Manage plan changes, Stripe checkout, and portal routing from the dedicated billing page.
          </p>
          <Link
            to="/billing"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)]"
          >
            Open billing
          </Link>
        </SurfacePanel>

        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Team</p>
          <p className="mt-3 text-sm leading-6 text-[var(--app-text-soft)]">
            Invite members, rename the organization, or keep this as a solo workspace until you need collaboration.
          </p>
          <Link
            to="/team"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface-strong)] px-5 text-sm font-semibold text-[var(--app-text)]"
          >
            Open team settings
          </Link>
        </SurfacePanel>
      </section>
    </PageContainer>
  );
}
