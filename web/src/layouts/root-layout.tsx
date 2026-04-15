import {type ReactNode} from "react";
import {Link, NavLink, useNavigate} from "react-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {appNavigation, pageTitleForPath} from "#/lib/app-navigation";
import {useAppRepository} from "#/lib/app-repository";
import {ThemeToggle} from "#/components/theme-toggle";

export function Layout({children}: {children: ReactNode}) {
  const repository = useAppRepository();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => repository.fetchBootstrap(),
  });
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  const logoutMutation = useMutation({
    mutationFn: () => repository.logout(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ["auth-session"]}),
        queryClient.invalidateQueries({queryKey: ["bootstrap"]}),
        queryClient.invalidateQueries({queryKey: ["me"]}),
      ]);
      navigate("/login", {replace: true});
    },
  });

  const appName = bootstrapQuery.data?.appName ?? "Starter Template";
  const session = sessionQuery.data;
  const userLabel = session?.user?.displayName || session?.user?.email || "User";
  const currentPath = typeof window === "undefined" ? "/" : window.location.pathname;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[2rem] border border-[var(--app-line)] bg-[var(--app-surface)] p-5 shadow-sm">
          <Link to="/" className="block">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-accent)]">
              Starter Template
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{appName}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">
              Reusable OTP + billing + team starter built on Go, Vite, SST, Fly, and SQLite/Turso.
            </p>
          </Link>

          <nav className="mt-8 space-y-2">
            {appNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({isActive}) =>
                  [
                    "block rounded-2xl px-4 py-3 transition",
                    isActive
                      ? "bg-[var(--app-accent)] text-[var(--app-accent-ink)]"
                      : "bg-[var(--app-muted-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]",
                  ].join(" ")
                }
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs leading-5 opacity-80">{item.description}</p>
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-[var(--app-line)] bg-[var(--app-surface-strong)] p-4">
            <p className="text-sm font-semibold">{userLabel}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">
              {session?.entitlements.plan?.toUpperCase() ?? "FREE"} plan
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ThemeToggle compact />
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line-strong)] bg-[var(--app-surface)] px-4 text-sm font-medium text-[var(--app-text)]"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-[var(--app-line)] bg-[var(--app-surface)] px-6 py-5 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                Authenticated App
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {pageTitleForPath(currentPath)}
              </h2>
            </div>
            <ThemeToggle />
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
