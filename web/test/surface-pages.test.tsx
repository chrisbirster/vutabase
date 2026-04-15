import {screen} from "@testing-library/react";
import {BillingPage} from "#/pages/BillingPage";
import {SettingsPage} from "#/pages/SettingsPage";
import {TeamPage} from "#/pages/TeamPage";
import {authenticatedSession, makeRepository, renderWithStarter} from "./test-utils";

describe("starter pages", () => {
  it("renders settings with profile and workspace information", async () => {
    renderWithStarter(<SettingsPage />, {
      repository: makeRepository({
        fetchSession: async () => authenticatedSession,
      }),
    });

    expect(await screen.findByRole("heading", {name: /manage your account defaults/i})).toBeInTheDocument();
    expect(screen.getByText("Owner Example")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: /open billing/i})).toHaveAttribute("href", "/billing");
  });

  it("renders the personal-team empty state when no organization exists yet", async () => {
    renderWithStarter(<TeamPage />, {
      repository: makeRepository({
        fetchSession: async () => authenticatedSession,
      }),
    });

    expect(await screen.findByRole("heading", {name: /this workspace is still personal/i})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: /open billing/i})).toHaveAttribute("href", "/billing");
  });

  it("renders billing plan options and current subscription status", async () => {
    renderWithStarter(<BillingPage />, {
      repository: makeRepository({
        fetchSession: async () => authenticatedSession,
      }),
    });

    expect(await screen.findByRole("heading", {name: /manage plans and stripe flows/i})).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Subscription status")).toBeInTheDocument();
    expect(screen.getByText("manual")).toBeInTheDocument();
  });
});
