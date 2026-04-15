type FeatureItem = {
  title: string;
  description: string;
};

type PlanTier = {
  name: string;
  price: string;
  detail: string;
  summary: string;
};

type LegalSection = {
  heading: string;
  body: string[];
};

type LegalPage = {
  title: string;
  summary: string;
  sections: LegalSection[];
};

const appOrigin = (
  import.meta.env.APP_ORIGIN ||
  (import.meta.env.DEV ? "http://localhost:3000" : "https://app.starter-template.example.com")
).replace(/\/$/, "");
const marketingOrigin = (
  import.meta.env.APP_MARKETING_ORIGIN ||
  (import.meta.env.DEV ? "http://localhost:4173" : "https://starter-template.example.com")
).replace(/\/$/, "");
const supportEmail = (import.meta.env.APP_SUPPORT_EMAIL || "support@starter-template.example.com").trim();
const supportMailto = `mailto:${supportEmail}?subject=Starter%20Template%20Support`;

const featureItems: FeatureItem[] = [
  {
    title: "OTP authentication",
    description: "Passwordless email sign-in and secure server-side sessions stay wired into the starter from day one.",
  },
  {
    title: "Billing ready",
    description: "Stripe checkout, billing portal, and subscription sync helpers are already kept in the platform layer.",
  },
  {
    title: "Team support",
    description: "Organizations, member roles, invites, and workspace plan management remain available as generic SaaS building blocks.",
  },
  {
    title: "Two-site model",
    description: "Keep the marketing site on the root domain and the authenticated app on the app subdomain without changing the stack.",
  },
  {
    title: "SQLite to Turso",
    description: "Develop locally on SQLite and keep a production-style remote workflow ready through Turso hydration scripts.",
  },
  {
    title: "Deploy intact",
    description: "The starter preserves Fly app deploys for the container and SST deploys for the email API and marketing site.",
  },
];

const howItWorks = [
  "Clone the repo and create your env file.",
  "Run the local stack with `task bootstrap` and `task dev:full`.",
  "Replace the placeholder app shell and marketing copy with your product.",
] as const;

const planTiers: PlanTier[] = [
  {
    name: "Free",
    price: "$0",
    detail: "Personal starter limits",
    summary: "A simple baseline for solo development and local testing.",
  },
  {
    name: "Pro",
    price: "$12/mo",
    detail: "Solo operators",
    summary: "A ready-made paid tier for projects that want billing in place early.",
  },
  {
    name: "Team",
    price: "$8/user/mo",
    detail: "3-seat minimum",
    summary: "A reusable team tier that keeps roles, invites, and shared billing in the starter.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    detail: "Manual path",
    summary: "A placeholder for larger contracts and sales-led onboarding.",
  },
];

const legalPages: Record<string, LegalPage> = {
  "/privacy": {
    title: "Privacy",
    summary: "How this starter template expects a future app to handle account, session, and billing data.",
    sections: [
      {
        heading: "What the starter keeps",
        body: [
          "The extracted starter keeps generic account, session, workspace, organization, and subscription records.",
          "It intentionally removes the original product-domain content so future teams can define their own data model on top of the platform.",
        ],
      },
      {
        heading: "What teams still need to do",
        body: [
          "Replace this placeholder privacy page with a real policy before launch.",
          "Review your own email, billing, analytics, and data-retention requirements once the starter has been renamed into a real product.",
        ],
      },
    ],
  },
  "/terms": {
    title: "Terms",
    summary: "Starter placeholder terms for a future SaaS product built on this template.",
    sections: [
      {
        heading: "Starter status",
        body: [
          "This repository is a reusable base, not a finished public product.",
          "Any team shipping a cloned version should replace these placeholder terms with their own final agreement.",
        ],
      },
      {
        heading: "Platform assumptions",
        body: [
          "The starter includes OTP sign-in, billing hooks, workspace membership, and an authenticated app shell.",
          "A real deployment still needs production policies, limits, and support terms set by the adopting team.",
        ],
      },
    ],
  },
  "/contact": {
    title: "Contact",
    summary: "Starter placeholder contact details for support, billing, and launch questions.",
    sections: [
      {
        heading: "Default contact",
        body: [
          `Replace ${supportEmail} with your real support or founder inbox before launch.`,
          "This page exists so cloned projects have an obvious place to swap in real public contact details.",
        ],
      },
    ],
  },
  "/support": {
    title: "Support",
    summary: "Starter placeholder support guidance for sign-in, billing, and workspace administration.",
    sections: [
      {
        heading: "What this page covers",
        body: [
          "OTP sign-in problems, billing questions, and workspace or organization setup are the main retained platform flows.",
          "Replace this page with real support policies, SLAs, and escalation paths before you ship a live customer-facing product.",
        ],
      },
    ],
  },
  "/refunds": {
    title: "Refunds",
    summary: "Starter placeholder billing and refund language for future subscription products.",
    sections: [
      {
        heading: "Before launch",
        body: [
          "Decide what your refund, cancellation, and downgrade policy will be for the product you build on top of this starter.",
          "The starter keeps billing mechanics, but teams still need to define the business policy and public copy.",
        ],
      },
    ],
  },
};

function NavLink({href, children}: {href: string; children: string}) {
  return (
    <a href={href} className="site-nav-link">
      {children}
    </a>
  );
}

function PrimaryLink({href, children}: {href: string; children: string}) {
  return (
    <a href={href} className="site-button site-button-primary">
      {children}
    </a>
  );
}

function SecondaryLink({href, children}: {href: string; children: string}) {
  return (
    <a href={href} className="site-button site-button-secondary">
      {children}
    </a>
  );
}

function Shell({children}: {children: ReactNode}) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a href={marketingOrigin || "/"} className="site-brand">
          <span className="site-brand-mark">Template</span>
          <span className="site-brand-copy">Go + React + Fly + SST</span>
        </a>
        <nav className="site-nav" aria-label="Primary">
          <NavLink href="/#features">Features</NavLink>
          <NavLink href="/#how-it-works">How it works</NavLink>
          <NavLink href="/#pricing">Pricing</NavLink>
          <NavLink href="/support">Support</NavLink>
          <NavLink href={appOrigin}>Open app</NavLink>
        </nav>
      </header>
      {children}
    </div>
  );
}

function LandingPage() {
  return (
    <Shell>
      <main>
        <section className="hero-block">
          <div className="hero-copy">
            <p className="eyebrow">Reusable SaaS starter</p>
            <h1>Preserve the platform, replace the product.</h1>
            <p className="hero-summary">
              This starter keeps OTP auth, billing, teams, a Go backend, an embedded React app,
              a separate marketing site, SST infrastructure, Fly deploys, and SQLite-to-Turso workflow.
            </p>
            <div className="hero-actions">
              <PrimaryLink href={appOrigin}>Open app</PrimaryLink>
              <SecondaryLink href="/#how-it-works">See the flow</SecondaryLink>
            </div>
          </div>
          <aside className="hero-panel">
            <p className="hero-panel-label">What stays</p>
            <ul>
              <li>OTP email login and sessions</li>
              <li>Stripe checkout and billing portal helpers</li>
              <li>Workspace and organization management</li>
              <li>Fly + SST deployment workflow</li>
            </ul>
          </aside>
        </section>

        <section id="features" className="site-section">
          <div className="section-heading">
            <p className="eyebrow">Features</p>
            <h2>The reusable infrastructure is already in place.</h2>
            <p>
              The starter keeps the operational surfaces teams usually rebuild from scratch and removes the original app-specific domain.
            </p>
          </div>
          <div className="feature-grid">
            {featureItems.map((item) => (
              <article key={item.title} className="feature-panel">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="site-section">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>Clone, rename, and start building.</h2>
          </div>
          <ol className="steps-grid">
            {howItWorks.map((step, index) => (
              <li key={step} className="step-panel">
                <span className="step-index">0{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" className="site-section">
          <div className="section-heading">
            <p className="eyebrow">Pricing teaser</p>
            <h2>Billing stays generic and ready to replace.</h2>
            <p>
              The starter preserves the plan model and checkout flow so future teams can swap in their own pricing and copy without reworking the plumbing.
            </p>
          </div>
          <div className="pricing-grid">
            {planTiers.map((tier) => (
              <article key={tier.name} className="pricing-panel">
                <p className="pricing-name">{tier.name}</p>
                <p className="pricing-price">{tier.price}</p>
                <p className="pricing-detail">{tier.detail}</p>
                <p className="pricing-summary">{tier.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-block">
          <div>
            <p className="eyebrow">Ready to start</p>
            <h2>Use the starter as the platform for your next product.</h2>
            <p>
              Keep the current architecture, rename the defaults, and replace the placeholder shell with the domain your team actually wants to ship.
            </p>
          </div>
          <div className="cta-actions">
            <PrimaryLink href={appOrigin}>Open app</PrimaryLink>
            <SecondaryLink href={supportMailto}>Contact support</SecondaryLink>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <p className="site-footer-title">Starter template marketing site</p>
          <p className="site-footer-copy">
            Root domain marketing for the extracted SaaS starter. Replace the copy, keep the structure.
          </p>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
          <a href="/support">Support</a>
          <a href="/refunds">Refunds</a>
        </nav>
      </footer>
    </Shell>
  );
}

function LegalPageView({page}: {page: LegalPage}) {
  return (
    <Shell>
      <main className="legal-shell">
        <section className="legal-hero">
          <p className="eyebrow">Starter placeholder</p>
          <h1>{page.title}</h1>
          <p>{page.summary}</p>
          <div className="hero-actions">
            <PrimaryLink href={appOrigin}>Open app</PrimaryLink>
            <SecondaryLink href={supportMailto}>Email support</SecondaryLink>
          </div>
        </section>

        <section className="legal-sections">
          {page.sections.map((section) => (
            <article key={section.heading} className="legal-panel">
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <p className="site-footer-title">{page.title}</p>
          <p className="site-footer-copy">Replace this page before launching a real product built on the starter.</p>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          <a href="/">Home</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
          <a href="/support">Support</a>
        </nav>
      </footer>
    </Shell>
  );
}

export function App() {
  const path = typeof window === "undefined"
    ? "/"
    : (window.location.pathname.replace(/\/+$/, "") || "/");
  const page = legalPages[path];

  if (page) {
    return <LegalPageView page={page} />;
  }

  return <LandingPage />;
}
import type {ReactNode} from "react";
