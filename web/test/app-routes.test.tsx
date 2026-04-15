import {screen} from "@testing-library/react";
import {AppRoutes} from "#/App";
import {renderWithStarter, authenticatedSession, makeRepository, starterBootstrap, unauthenticatedSession} from "./test-utils";

describe("app routes", () => {
  it("redirects unauthenticated visitors on / to the login page", async () => {
    renderWithStarter(<AppRoutes />, {
      route: "/",
      repository: makeRepository({
        fetchSession: async () => unauthenticatedSession,
      }),
    });

    expect(
      await screen.findByRole("heading", {name: /sign in with otp and start building/i}),
    ).toBeInTheDocument();
  });

  it("renders the starter dashboard for authenticated users on /", async () => {
    renderWithStarter(<AppRoutes />, {
      route: "/",
      repository: makeRepository({
        fetchSession: async () => authenticatedSession,
        fetchMe: async () => authenticatedSession,
        fetchBootstrap: async () => starterBootstrap,
      }),
    });

    expect(
      await screen.findByRole("heading", {
        name: /this repository is ready to be renamed into your next product/i,
      }),
    ).toBeInTheDocument();
  });

  it("redirects onboarding users into plan selection", async () => {
    renderWithStarter(<AppRoutes />, {
      route: "/",
      repository: makeRepository({
        fetchSession: async () => ({
          ...authenticatedSession,
          user: {
            ...authenticatedSession.user!,
            onboarding: true,
          },
        }),
      }),
    });

    expect(
      await screen.findByRole("heading", {name: /choose the plan that fits your starter project/i}),
    ).toBeInTheDocument();
  });
});
