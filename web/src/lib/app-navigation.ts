export interface AppNavigationItem {
  to: string;
  label: string;
  description: string;
}

export const appNavigation: AppNavigationItem[] = [
  {
    to: "/",
    label: "App",
    description: "Starter dashboard and authenticated shell",
  },
  {
    to: "/settings",
    label: "Settings",
    description: "Profile, workspace, and session settings",
  },
  {
    to: "/team",
    label: "Team",
    description: "Organization details, roles, and invites",
  },
  {
    to: "/billing",
    label: "Billing",
    description: "Plans, checkout, and subscription management",
  },
];

export function pageTitleForPath(pathname: string): string {
  if (pathname === "/") return "App";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/team")) return "Team";
  if (pathname.startsWith("/billing")) return "Billing";
  if (pathname.startsWith("/onboarding/plan")) return "Choose Plan";
  return "Starter Template";
}
