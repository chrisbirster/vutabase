# Starter Template Infra (SST)

This directory provisions the reusable infrastructure that stays after the product extraction:

1. An AWS SES-backed email API for OTP delivery
2. A Cloudflare-hosted marketing `StaticSite` built from `../marketing`

Quick reference:
- [Infra Cheatsheet](./CHEATSHEET.md)

## What Gets Created

- `sst.Secret("EmailApiKey")`
- `sst.aws.Function("EmailApi")`
- `sst.cloudflare.StaticSite("WebSite")` when marketing deploy is enabled

The stack name defaults to `starter-infra`.

## Required Inputs

Required:

```bash
export AWS_REGION=us-east-1
```

Common optional values:

```bash
export APP_EMAIL_SENDER=starter-template.example.com
export APP_EMAIL_FROM=no-reply@starter-template.example.com
export APP_EMAIL_SEND_AUTH_HEADER=Authorization
export APP_MANUAL_SES_IDENTITY=true
export APP_ENABLE_MARKETING_SITE=true
export APP_MARKETING_DOMAIN=starter-template.example.com
export APP_ORIGIN=https://app.starter-template.example.com
export APP_MARKETING_ORIGIN=https://starter-template.example.com
```

Needed when SST should attach the marketing domain in Cloudflare:

```bash
export CLOUDFLARE_API_TOKEN="<cloudflare-api-token>"
export CLOUDFLARE_DEFAULT_ACCOUNT_ID="<cloudflare-account-id>"
```

## SES Checklist

SST deploys the email function, but SES still needs real DNS and sender setup outside the repo:

1. Create or confirm the SES identity for your domain.
2. Publish verification and DKIM records.
3. Request SES production access.
4. Add SPF and DMARC records.
5. Set `APP_EMAIL_SENDER` and `APP_EMAIL_FROM` to real values.

If you already manage SES manually, keep `APP_MANUAL_SES_IDENTITY=true`.

## Env Workflow

Recommended files:

- `.env.local` for SQLite development
- `.env.production` for the production source of truth

Hydrate a Turso-backed production env:

```bash
TURSO_DB=starter-prod task env:hydrate:production
```

Or override the origins explicitly:

```bash
ENV_FILE=.env.production \
TURSO_DB=starter-prod \
APP_ORIGIN=https://app.starter-template.example.com \
APP_MARKETING_ORIGIN=https://starter-template.example.com \
APP_ENV=production \
task env:hydrate:turso
```

That task writes:

- `APP_DATABASE_URL`
- `APP_DATABASE_AUTH_TOKEN`
- `APP_ORIGIN`
- `APP_MARKETING_ORIGIN`
- `APP_MARKETING_DOMAIN`
- `APP_COOKIE_SECURE`
- `APP_SESSION_SECRET` if missing

## Local Development

Create the local env file once:

```bash
task env:init:local
```

Run the full local stack:

```bash
ENV_FILE=.env.local task dev:full
```

Run against Turso locally:

```bash
ENV_FILE=.env.production task dev:turso
```

## First-Time SST Setup

```bash
cd infra
bun install
bunx sst install
bunx sst secret set EmailApiKey "<strong-random-token>" --stage production
```

Deploy the infra:

```bash
ENV_FILE=.env.production task deploy:infra
```

## Billing Setup

The starter keeps Stripe billing helpers for recurring plans:

- Free
- Pro: `$12/month`
- Team: `$8/user/month`, 3-seat minimum
- Enterprise: sales-led placeholder

Add the Stripe secret key to your env file:

```bash
APP_STRIPE_SECRET_KEY=sk_live_...
```

Bootstrap product and price IDs:

```bash
ENV_FILE=.env.production task stripe:billing:bootstrap
```

That fills:

- `APP_STRIPE_BILLING_PRICE_PRO_MONTHLY`
- `APP_STRIPE_BILLING_PRICE_TEAM_MONTHLY`

Local webhook forwarding:

```bash
task stripe:billing:listen
```

## Deploy Model

- Marketing site: `https://starter-template.example.com`
- App domain: `https://app.starter-template.example.com`
- Fly app: `starter-app`

Adjust those values before you launch a real project.
