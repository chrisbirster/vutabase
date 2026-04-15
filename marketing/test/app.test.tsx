import {render, screen} from "@testing-library/react";
import {App} from "../src/App";

describe("marketing app", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders the landing page with an app CTA", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {name: /preserve the platform, replace the product/i}),
    ).toBeInTheDocument();
    const appLinks = screen.getAllByRole("link", {name: /open app/i});

    expect(appLinks.length).toBeGreaterThan(0);
    expect(appLinks[0]).toHaveAttribute("href", "http://localhost:3000");
  });

  it("renders a legal route when the pathname is not the homepage", () => {
    window.history.replaceState({}, "", "/privacy");

    render(<App />);

    expect(screen.getByRole("heading", {name: "Privacy"})).toBeInTheDocument();
    expect(
      screen.getByText(/replace this placeholder privacy page with a real policy/i),
    ).toBeInTheDocument();
  });
});
