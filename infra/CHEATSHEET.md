# Starter Template Infra Cheatsheet

Assumptions:

- run commands from the repo root
- `.env.local` is for local SQLite
- `.env.production` is the production source of truth
- Fly app name is `starter-app`

## Local Dev

Create the local env file:

```bash
task env:init:local
```

Run backend + app:

```bash
ENV_FILE=.env.local task dev
```

Run backend + app + marketing:

```bash
ENV_FILE=.env.local task dev:full
```

## Turso

Create a Turso database:

```bash
turso db create starter-prod
```

Hydrate `.env.production`:

```bash
TURSO_DB=starter-prod task env:hydrate:production
```

Run locally against the production-style Turso config:

```bash
ENV_FILE=.env.production task dev:turso
```

## SST

Set the SST email API secret once:

```bash
cd infra
bunx sst secret set EmailApiKey "<strong-random-token>" --stage production
```

Deploy infra:

```bash
ENV_FILE=.env.production task deploy:infra
```

## Fly

Import secrets:

```bash
ENV_FILE=.env.production FLY_APP=starter-app task secrets:fly:import
```

Deploy:

```bash
FLY_APP=starter-app task deploy:fly
```

Import secrets and deploy:

```bash
ENV_FILE=.env.production FLY_APP=starter-app task deploy:fly:sync
```

Create the Fly app:

```bash
fly apps create starter-app
```

## Stripe

Bootstrap price IDs:

```bash
ENV_FILE=.env.production task stripe:billing:bootstrap
```

Listen for webhooks locally:

```bash
task stripe:billing:listen
```

Expected billing env values:

```env
APP_STRIPE_SECRET_KEY=sk_live_...
APP_STRIPE_WEBHOOK_SECRET=whsec_...
APP_STRIPE_BILLING_PRICE_PRO_MONTHLY=price_...
APP_STRIPE_BILLING_PRICE_TEAM_MONTHLY=price_...
APP_STRIPE_BILLING_CHECKOUT_SUCCESS_URL=https://app.starter-template.example.com/billing/complete?checkout=success
APP_STRIPE_BILLING_CHECKOUT_CANCEL_URL=https://app.starter-template.example.com/billing/complete?checkout=cancelled
APP_STRIPE_BILLING_PORTAL_RETURN_URL=https://app.starter-template.example.com/settings?billing=returned
```

## Production Checks

```bash
curl -I https://starter-template.example.com
curl -I https://app.starter-template.example.com
fly status -a starter-app
fly logs -a starter-app
```
