# Starter Template

This repo is a reusable SaaS starter built around a Go backend, an embedded React SPA, a separate marketing site, SST-managed email and marketing infrastructure, Fly.io app deploys, OTP auth, Stripe billing helpers, and SQLite/Turso data storage.

The goal of this extraction pass is simple: preserve the platform, delete the old product.

## Repo Structure

- `main.go` and root `*.go`: Go API, auth/session logic, billing/team flows, and embedded SPA server
- [`web`](./web): React + Vite + Tailwind app shell for the authenticated product surface
- [`marketing`](./marketing): separate marketing site for the root domain
- [`infra`](./infra): SST stack for the email API and marketing deploy
- [`scripts`](./scripts): env hydration, Fly secret import, billing bootstrap, and verification helpers
- [`TEMPLATE_EXTRACTION_PLAN.md`](./TEMPLATE_EXTRACTION_PLAN.md): extraction scope and file classification

## Quick Start

1. Copy the example env file.
2. Initialize dependencies.
3. Start the full local stack.

```bash
cp .env.example .env.local
task bootstrap
ENV_FILE=.env.local task dev:full
```

For app-only local development:

```bash
ENV_FILE=.env.local task dev
```

## Local Development

Create or refresh a local SQLite env file:

```bash
task env:init:local
```

That writes starter defaults such as:

- `APP_DATABASE_PATH=./data/app.db`
- `APP_ORIGIN=http://localhost:3000`
- `APP_MARKETING_ORIGIN=http://localhost:4173`

Useful commands:

```bash
task bootstrap
task dev
task dev:full
task build
task test
```

## Production Env Model

This starter uses:

- `.env.local` for local SQLite development
- `.env.production` as the production source of truth

Hydrate a production-style Turso env:

```bash
TURSO_DB=starter-prod task env:hydrate:production
```

Or use the generic hydrator with explicit origins:

```bash
ENV_FILE=.env.production \
TURSO_DB=starter-prod \
APP_ORIGIN=https://app.starter-template.example.com \
APP_MARKETING_ORIGIN=https://starter-template.example.com \
APP_ENV=production \
task env:hydrate:turso
```

## Deploy

Deploy infrastructure with SST:

```bash
ENV_FILE=.env.production task deploy:infra
```

Deploy the Fly app:

```bash
ENV_FILE=.env.production FLY_APP=starter-app task deploy:fly
```

Import Fly secrets and deploy together:

```bash
ENV_FILE=.env.production FLY_APP=starter-app task deploy:fly:sync
```

Build the production container locally:

```bash
docker build .
```

## Billing and Auth

This starter keeps:

- OTP login by email
- Session cookies
- Billing checkout and portal helpers
- Team and workspace plan management

Bootstrap starter Stripe prices into an env file:

```bash
ENV_FILE=.env.production task stripe:billing:bootstrap
```

Forward billing webhooks locally:

```bash
task stripe:billing:listen
```

## Renaming for a New Project

Before launching a real project, update:

- `APP_NAME`
- `APP_ORIGIN`
- `APP_MARKETING_ORIGIN`
- `FLY_APP`
- `APP_MARKETING_DOMAIN`
- `APP_EMAIL_FROM`
- `APP_EMAIL_SENDER`
- Stripe price IDs and webhook secrets

You should also replace the placeholder support and sales email addresses:

- `support@starter-template.example.com`
- `sales@starter-template.example.com`

## More Docs

- Infra setup: [infra/README.md](./infra/README.md)
- Infra cheatsheet: [infra/CHEATSHEET.md](./infra/CHEATSHEET.md)
- Clone checklist: [STARTER_TEMPLATE_CHECKLIST.md](./STARTER_TEMPLATE_CHECKLIST.md)

## License

Review [LICENSE.md](./LICENSE.md) before publishing a cloned project. Most teams will want to replace it with their own license or internal usage policy.
