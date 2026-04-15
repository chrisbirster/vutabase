# Starter Template Checklist

Use this checklist after cloning the starter into a new project.

## Rename Checklist

- Update `APP_NAME` to your real product name.
- Rename the Fly app from `starter-app` to your production Fly app name.
- Rename the SST app from `starter-infra` if you want a project-specific stack name.
- Replace `starter-template.example.com` and `app.starter-template.example.com` everywhere with your real domains.
- Replace `support@starter-template.example.com` and `sales@starter-template.example.com` with real inboxes.
- Replace placeholder pricing copy in the app shell and marketing site.
- Replace the placeholder legal, support, and refund pages before launch.

## Required Env Vars

Local SQLite minimum:

- `APP_NAME`
- `APP_ENV`
- `APP_ORIGIN`
- `APP_MARKETING_ORIGIN`
- `APP_DATABASE_PATH`
- `APP_SESSION_SECRET`

Production minimum:

- `APP_NAME`
- `APP_ENV=production`
- `APP_ORIGIN`
- `APP_MARKETING_ORIGIN`
- `APP_MARKETING_DOMAIN`
- `APP_DATABASE_URL`
- `APP_DATABASE_AUTH_TOKEN`
- `APP_SESSION_SECRET`
- `APP_COOKIE_SECURE=true`
- `APP_EMAIL_SEND_URL`
- `APP_EMAIL_SEND_AUTH_HEADER`
- `APP_EMAIL_SEND_AUTH_VALUE`
- `APP_EMAIL_FROM`
- `APP_EMAIL_SENDER`

Billing-enabled production:

- `APP_STRIPE_SECRET_KEY`
- `APP_STRIPE_WEBHOOK_SECRET`
- `APP_STRIPE_BILLING_PRICE_PRO_MONTHLY`
- `APP_STRIPE_BILLING_PRICE_TEAM_MONTHLY`
- `APP_STRIPE_BILLING_CHECKOUT_SUCCESS_URL`
- `APP_STRIPE_BILLING_CHECKOUT_CANCEL_URL`
- `APP_STRIPE_BILLING_PORTAL_RETURN_URL`

## Domain Setup Checklist

- Provision the root marketing domain, for example `your-product.com`.
- Provision the app subdomain, for example `app.your-product.com`.
- Point the marketing domain at the SST/Cloudflare marketing site.
- Point the app domain at the Fly app.
- Verify TLS on both domains.
- Confirm cookie behavior is correct on the app origin.
- Set SES/SPF/DKIM/DMARC records for your sender domain.

## Fly Setup Checklist

- Create the Fly app: `fly apps create <your-fly-app>`.
- Set `FLY_APP=<your-fly-app>` when deploying.
- Import production secrets with `task secrets:fly:import`.
- Confirm `fly.toml` matches the intended app name and region.
- Verify the app responds on `/api/health` after deploy.

## SST Setup Checklist

- Run `cd infra && bun install && bunx sst install`.
- Set the `EmailApiKey` secret for each stage you use.
- Set `AWS_REGION`.
- Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_DEFAULT_ACCOUNT_ID` if you are deploying the marketing site through SST.
- Set `APP_EMAIL_FROM` and `APP_EMAIL_SENDER` to verified SES values.
- Deploy with `ENV_FILE=.env.production task deploy:infra`.

## Stripe Setup Checklist

- Create a live Stripe account and obtain `APP_STRIPE_SECRET_KEY`.
- Bootstrap or create real recurring prices.
- Write the returned price IDs into `.env.production`.
- Configure the billing webhook endpoint for your deployed app.
- Set `APP_STRIPE_WEBHOOK_SECRET`.
- Verify checkout, portal, upgrade, and downgrade flows.

## Post-Clone Smoke Test Checklist

- `cp .env.example .env.local`
- `task bootstrap`
- `ENV_FILE=.env.local task test`
- `ENV_FILE=.env.local task build`
- `ENV_FILE=.env.local task dev`
- `ENV_FILE=.env.local task dev:full`
- `docker build .`
- Confirm `/api/health` returns a generic starter response.
- Confirm the app domain renders `/login` and `/`.
- Confirm the marketing domain renders `/`.
