# Vutabase — Project Context

## Project Overview

**Vutabase** is a production-ready SaaS starter template for building web applications quickly without rebuilding the same platform foundation every time.

The repo is intentionally generic. It provides the shared infrastructure and application skeleton for future products, including:

- Go backend at the repo root
- embedded React/Vite app in `web/`
- separate marketing site in `marketing/`
- OTP login by email
- billing and team/workspace foundations
- SST infrastructure for email and marketing deploys
- Fly.io deployment for the app container
- local SQLite development and production-style Turso workflow

Vutabase is a base platform, not a product with a fixed domain model. New projects should be created by cloning this template, renaming placeholder values, and then layering in product-specific features.

---

## Architecture

### Two-Origin Setup

The template assumes a split deployment model:

- **Marketing site:** `https://<domain>.com`
- **Product app:** `https://app.<domain>.com`

Routing expectations:

- The authenticated app home lives at `/` on the app origin
- The marketing homepage lives at `/` on the root origin
- Users authenticate on the app origin
- Marketing links should send users to the app origin for login or product access

### Backend

- **Language:** Go
- **Style:** small, explicit HTTP API with clear handlers and minimal hidden magic
- **Responsibilities:**
  - auth/session handling
  - bootstrap/config APIs
  - billing/team/workspace APIs
  - persistence
  - serving the embedded app build

### Frontend App

- **Location:** `web/`
- **Stack:** React + Vite + TypeScript + TanStack Query
- **Responsibilities:**
  - authenticated app shell
  - login flow
  - settings
  - billing/team UI
  - future product UI layered on top of the starter

### Marketing Site

- **Location:** `marketing/`
- **Purpose:** root-domain marketing presence for the product
- **Responsibilities:**
  - landing page
  - feature overview
  - CTA to app origin
  - optional support/legal/static pages

### Infrastructure

- **SST** manages:
  - email API path
  - marketing deploy path
- **Fly.io** runs the app container
- **SQLite** is the default local database
- **Turso** is the production-style remote database option

---

## Project Structure

```text
/
├── main.go                        # Go app entrypoint
├── config.go                      # Environment/config loading
├── storage.go                     # Persistence layer
├── migrations.go                  # Database schema and migrations
├── Taskfile.yml                   # Common dev/build/deploy commands
├── Dockerfile                     # App container build
├── fly.toml                       # Fly app config
├── .env.example                   # Starter env template
├── STARTER_TEMPLATE_CHECKLIST.md  # Post-clone setup checklist
├── AGENTS.md                      # This file
├── web/                           # Authenticated product app
├── marketing/                     # Root-domain marketing site
└── infra/                         # SST infrastructure