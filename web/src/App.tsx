import {BrowserRouter, Navigate, Outlet, Route, Routes, useLocation} from "react-router";
import {useQuery} from "@tanstack/react-query";
import {Layout} from "#/layouts/root-layout";
import {useAppRepository} from "#/lib/app-repository";
import {HomePage} from "#/pages/HomePage";
import {LoginPage} from "#/pages/LoginPage";
import {SettingsPage} from "#/pages/SettingsPage";
import {TeamPage} from "#/pages/TeamPage";
import {BillingPage} from "#/pages/BillingPage";
import {BillingCompletePage} from "#/pages/BillingCompletePage";
import {OnboardingPlanPage} from "#/pages/OnboardingPlanPage";

function RequireAuthLayout() {
  const repository = useAppRepository();
  const location = useLocation();
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: () => repository.fetchSession(),
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-sm text-[var(--app-muted)]">
        Checking session...
      </div>
    );
  }

  if (!sessionQuery.data?.authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{from: `${location.pathname}${location.search}`}}
      />
    );
  }

  const onboarding = sessionQuery.data.user?.onboarding ?? false;
  const isOnboardingPath = location.pathname.startsWith("/onboarding/plan");
  const isBillingCompletionPath = location.pathname.startsWith("/billing/complete");

  if (onboarding && !isOnboardingPath && !isBillingCompletionPath) {
    return <Navigate to="/onboarding/plan" replace />;
  }

  if (!onboarding && isOnboardingPath) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuthLayout />}>
        <Route index element={<HomePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/complete" element={<BillingCompletePage />} />
        <Route path="onboarding/plan" element={<OnboardingPlanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
