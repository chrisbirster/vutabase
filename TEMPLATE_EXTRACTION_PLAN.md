# Starter Template Extraction Plan

This repository is being converted from a product-specific app into a reusable SaaS starter while preserving the current platform:

- Go backend at the repo root
- Embedded SPA built from `web/`
- Separate `marketing/` site
- SST infrastructure in `infra/`
- Fly.io deploy for the app container
- OTP login by email
- Stripe billing helpers
- Local SQLite and production-style Turso support
- Existing task-based developer workflow

## Audit Classification

### KEEP

- `Taskfile.yml`
- `Dockerfile`
- `fly.toml`
- `infra/*`
- `scripts/env/*`
- `scripts/check_coverage.sh`
- `scripts/stripe/bootstrap_billing.py`
- `main.go`
- `config.go`
- `server_runtime.go`
- `api_errors.go`
- `auth_otp.go`
- `email_sender.go`
- `account_store.go`
- `account_store_otp.go`
- `phase5a_account_handlers.go`
- `subscription_billing.go`
- `subscription_billing_handlers.go`
- Toolchain files under `web/` and `marketing/`

### RENAME / GENERALIZE

- `README.md`
- `Taskfile.yml`
- `Dockerfile`
- `fly.toml`
- `.env.example`
- `infra/README.md`
- `infra/CHEATSHEET.md`
- `infra/sst.config.ts`
- `infra/functions/email.ts`
- `test.sh`
- `product.go`
- `plans.go`
- `storage.go`
- `migrations.go`
- `api_handlers_extra.go`
- `web/src/App.tsx`
- `web/src/layouts/root-layout.tsx`
- `web/src/lib/api.ts`
- `web/src/lib/app-navigation.ts`
- `web/src/lib/app-repository.tsx`
- `web/src/lib/theme.tsx`
- `web/src/pages/LoginPage.tsx`
- `web/src/pages/HomePage.tsx`
- `web/src/pages/SettingsPage.tsx`
- `web/src/pages/TeamPage.tsx`
- `web/src/pages/BillingPage.tsx`
- `web/src/pages/BillingCompletePage.tsx`
- `web/src/pages/OnboardingPlanPage.tsx`
- `marketing/src/App.tsx`
- `marketing/src/index.css`
- `marketing/index.html`

### REMOVE

- Flashcard/study domain backend files:
  - `collection.go`
  - `server.go`
  - `crud_phase1.go`
  - `backup.go`
  - `importer.go`
  - `ai_suggestions.go`
  - `marketplace*.go`
  - `study_groups*.go`
  - `study_sessions*.go`
  - `study_analytics_store.go`
- Flashcard web routes/components:
  - `DecksPage`
  - `NotesPage`
  - `AddNotePage`
  - `StudyPage`
  - `StatsPage`
  - `FocusPage`
  - `TemplatesPage`
  - `StudyGroupsPage`
  - `MarketplacePage`
  - `EmptyCardsPage`
  - `AddNoteScreen`
  - `StudyScreen`
  - `TemplateEditor`
  - `FieldEditor`
  - Related deck/note/template helpers
- Flashcard-specific Go tests, Vitest files, Playwright specs, and generated reports
- Old product roadmaps and extraction leftovers that no longer apply to the starter

### OPTIONAL BUT KEEP FOR NOW

- Organization/team management
- Billing checkout and customer portal flows
- Stripe bootstrap and local webhook tasks
- SES email API deploy
- SQLite/Turso hydration scripts
- Legal/support marketing pages, rewritten to generic starter language

## Execution Order

### Pass A

- Rebrand workflow defaults and docs
- Move examples to `APP_*`
- Rename binary, Fly app, SST app, and starter-facing docs
- Create `.env.example`

### Pass B

- Keep auth, session, billing, workspace, and team flows
- Remove flashcard schema/routes/handlers
- Keep a fresh starter schema only
- Return generic `/api/bootstrap` and `/api/me` payloads

### Pass C

- Collapse `web/` into a starter app shell
- Rewrite `marketing/` into a generic SaaS landing site
- Delete legacy flashcard tests and replace with starter-focused coverage

## Naming Defaults

- Env prefix: `APP_*`
- Binary: `starter-app`
- Fly app: `starter-app`
- SST app: `starter-infra`
- API health service: `starter-api`
- Local DB: `./data/app.db`
- App origin: `https://app.starter-template.example.com`
- Marketing origin: `https://starter-template.example.com`
- Default post-auth route: `/` on the app origin

## Manual Follow-up

- Replace example domains with your real production domains
- Replace placeholder support/sales email addresses
- Set SES sender identity and DNS records
- Create real Stripe price IDs and webhook secrets
- Legacy env fallbacks were removed during starter hardening
