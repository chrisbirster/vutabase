import {useState} from "react";
import {Link} from "react-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {EmptyState, PageContainer, PageSection, SurfacePanel} from "#/components/page-layout";
import {useAppRepository} from "#/lib/app-repository";
import type {OrganizationMember} from "#/lib/api";

const memberRoleOptions: Array<OrganizationMember["role"]> = ["read", "edit", "admin", "owner"];

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

export function TeamPage() {
  const repository = useAppRepository();
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<OrganizationMember["role"], "owner">>("read");

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  const orgId =
    sessionQuery.data?.organization?.id ?? sessionQuery.data?.workspace?.organizationId;

  const teamQuery = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => repository.fetchOrganization(orgId!),
    enabled: Boolean(orgId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ["auth-session"]}),
      queryClient.invalidateQueries({queryKey: ["organization", orgId]}),
      queryClient.invalidateQueries({queryKey: ["me"]}),
      queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
    ]);
  };

  const createTeamMutation = useMutation({
    mutationFn: () => repository.createOrganization({name: teamName}),
    onSuccess: async () => {
      setTeamName("");
      await refresh();
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: () =>
      repository.updateOrganization(orgId!, {
        name: teamName,
        slug: teamQuery.data?.organization.slug,
      }),
    onSuccess: async () => {
      await refresh();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      repository.addOrganizationMember(orgId!, {
        email: inviteEmail,
        role: inviteRole,
      }),
    onSuccess: async () => {
      setInviteEmail("");
      setInviteRole("read");
      await refresh();
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: OrganizationMember["role"];
    }) => repository.updateOrganizationMember(orgId!, memberId, {role}),
    onSuccess: async () => {
      await refresh();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => repository.deleteOrganizationMember(orgId!, memberId),
    onSuccess: async () => {
      await refresh();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: () => repository.deleteOrganization(orgId!),
    onSuccess: async () => {
      await refresh();
    },
  });

  if (sessionQuery.isLoading || (orgId && teamQuery.isLoading)) {
    return (
      <PageContainer className="space-y-4">
        <PageSection className="p-5 text-sm text-[var(--app-text-soft)]">
          Loading team...
        </PageSection>
      </PageContainer>
    );
  }

  if (!sessionQuery.data?.authenticated) {
    return (
      <PageContainer className="space-y-4">
        <EmptyState title="Sign in required" description="Sign in to manage team settings." />
      </PageContainer>
    );
  }

  if (!orgId || !teamQuery.data) {
    return (
      <PageContainer className="space-y-6">
        <PageSection className="px-6 py-8 md:px-8 md:py-10">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--app-accent)]">
            Team
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
            This workspace is still personal.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)] sm:text-base">
            Upgrade to a Team plan from billing, then create an organization to unlock member roles
            and shared administration.
          </p>
        </PageSection>

        <SurfacePanel>
          <label className="block text-sm font-medium text-[var(--app-text-soft)]" htmlFor="team-name">
            Team name
          </label>
          <input
            id="team-name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Acme Team"
            className="mt-3 w-full rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => createTeamMutation.mutate()}
              disabled={createTeamMutation.isPending || teamName.trim().length === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)] disabled:opacity-60"
            >
              {createTeamMutation.isPending ? "Creating..." : "Create team"}
            </button>
            <Link
              to="/billing"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-5 text-sm font-medium text-[var(--app-text)]"
            >
              Open billing
            </Link>
          </div>
        </SurfacePanel>
      </PageContainer>
    );
  }

  const team = teamQuery.data;
  const currentRole = team.membership.role;
  const canManageMembers = team.canManageMembers;
  const canEditMetadata = currentRole === "admin" || currentRole === "owner";
  const canDeleteTeam = currentRole === "owner";

  return (
    <PageContainer className="space-y-6">
      <PageSection className="px-6 py-8 md:px-8 md:py-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--app-accent)]">
          Team
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
          {team.organization.name}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)] sm:text-base">
          Keep this page as the starter&apos;s generic organization admin surface, or replace it with your
          product&apos;s own collaboration model.
        </p>
      </PageSection>

      <section className="grid gap-6 lg:grid-cols-2">
        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Organization details</p>
          <div className="mt-4 grid gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-muted)]">
                Team name
              </label>
              <input
                value={teamName || team.organization.name}
                onChange={(event) => setTeamName(event.target.value)}
                disabled={!canEditMetadata}
                className="mt-2 w-full rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] disabled:opacity-60"
              />
            </div>
            <div className="text-sm text-[var(--app-text-soft)]">
              <p>Slug: <span className="text-[var(--app-text)]">{team.organization.slug}</span></p>
              <p className="mt-2">Current role: <span className="text-[var(--app-text)]">{team.membership.role}</span></p>
            </div>
            {canEditMetadata ? (
              <button
                type="button"
                onClick={() => updateTeamMutation.mutate()}
                disabled={updateTeamMutation.isPending || (teamName || team.organization.name).trim().length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)] disabled:opacity-60"
              >
                {updateTeamMutation.isPending ? "Saving..." : "Save team details"}
              </button>
            ) : null}
          </div>
        </SurfacePanel>

        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Workspace</p>
          <div className="mt-4 text-sm text-[var(--app-text-soft)]">
            <p>Workspace: <span className="text-[var(--app-text)]">{team.workspace?.name || "Unknown"}</span></p>
            <p className="mt-2">Plan: <span className="text-[var(--app-text)]">{team.subscription?.plan?.toUpperCase() || "FREE"}</span></p>
            <p className="mt-2">Members: <span className="text-[var(--app-text)]">{team.members.length}</span></p>
          </div>
          <Link
            to="/billing"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-5 text-sm font-medium text-[var(--app-text)]"
          >
            Manage billing
          </Link>
        </SurfacePanel>
      </section>

      <SurfacePanel>
        <p className="text-sm font-semibold text-[var(--app-text)]">Invite member</p>
        {canManageMembers ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@company.com"
              className="rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as Exclude<OrganizationMember["role"], "owner">)}
              className="rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            >
              <option value="read">Read</option>
              <option value="edit">Edit</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || inviteEmail.trim().length === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] px-5 text-sm font-semibold text-[var(--app-accent-ink)] disabled:opacity-60"
            >
              {inviteMutation.isPending ? "Inviting..." : "Invite"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--app-text-soft)]">
            Your current role does not allow inviting members.
          </p>
        )}
      </SurfacePanel>

      <PageSection className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--app-text)]">Members</h2>
        <div className="mt-5 space-y-3">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-surface-strong)] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">{member.email}</p>
                  <p className="mt-1 text-sm text-[var(--app-text-soft)]">
                    {member.status} · invited/updated {formatDate(member.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {canManageMembers ? (
                    <select
                      value={member.role}
                      onChange={(event) =>
                        updateMemberMutation.mutate({
                          memberId: member.id,
                          role: event.target.value as OrganizationMember["role"],
                        })
                      }
                      className="rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-4 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
                    >
                      {memberRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex min-h-11 items-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-4 text-sm text-[var(--app-text)]">
                      {member.role}
                    </span>
                  )}
                  {canManageMembers ? (
                    <button
                      type="button"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-4 text-sm font-medium text-[var(--app-text)]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      {canDeleteTeam ? (
        <SurfacePanel>
          <p className="text-sm font-semibold text-[var(--app-text)]">Delete team</p>
          <p className="mt-3 text-sm leading-6 text-[var(--app-text-soft)]">
            Deleting the team removes the organization wrapper and returns the workspace to personal mode.
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this team?")) {
                deleteTeamMutation.mutate();
              }
            }}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-danger-line)] bg-[var(--app-danger-surface)] px-5 text-sm font-semibold text-[var(--app-danger-text)]"
          >
            Delete team
          </button>
        </SurfacePanel>
      ) : null}
    </PageContainer>
  );
}
