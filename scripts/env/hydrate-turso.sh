#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${1:?usage: hydrate-turso.sh <env_file> <turso_db> [app_origin] [marketing_origin] [environment]}"
TURSO_DB="${2:?turso db name is required}"
APP_ORIGIN="${3:-https://app.starter-template.example.com}"
APP_MARKETING_ORIGIN="${4:-https://starter-template.example.com}"
APP_ENVIRONMENT="${5:-production}"
UPSERTER="$ROOT_DIR/scripts/env/upsert_env.py"

if ! command -v turso >/dev/null 2>&1; then
  echo "turso CLI is required. Install it from https://docs.turso.tech/cli/introduction" >&2
  exit 1
fi

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

session_secret="$(
  python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
)"

if ! grep -q '^APP_SESSION_SECRET=' "$ENV_FILE" 2>/dev/null; then
  python3 "$UPSERTER" "$ENV_FILE" "APP_SESSION_SECRET" "$session_secret"
fi

if db_url="$(turso db show --url "$TURSO_DB" 2>/dev/null)"; then
  :
elif db_url="$(turso db show "$TURSO_DB" --url 2>/dev/null)"; then
  :
else
  echo "Failed to resolve Turso database URL for '$TURSO_DB'." >&2
  echo >&2
  echo "Most likely causes:" >&2
  echo "  1. The database name is different from what you passed." >&2
  echo "  2. You are not logged into Turso in this shell." >&2
  echo "  3. Your current Turso org/account context does not include that database." >&2
  echo >&2
  echo "Try these commands:" >&2
  echo "  turso auth login" >&2
  echo "  turso db list" >&2
  echo "  turso db show --url $TURSO_DB" >&2
  echo >&2
  echo "If your database is named something else, rerun with that exact name." >&2
  exit 1
fi

db_token="$(turso db tokens create "$TURSO_DB" | tail -n 1 | tr -d '\r')"
db_url="$(printf "%s" "$db_url" | tail -n 1 | tr -d '\r')"
marketing_domain="$(
  python3 - "$APP_MARKETING_ORIGIN" <<'PY'
import sys
from urllib.parse import urlparse

parsed = urlparse(sys.argv[1].strip())
print((parsed.hostname or "").strip())
PY
)"

python3 "$UPSERTER" "$ENV_FILE" "APP_ENV" "$APP_ENVIRONMENT"
python3 "$UPSERTER" "$ENV_FILE" "APP_DATABASE_URL" "$db_url"
python3 "$UPSERTER" "$ENV_FILE" "APP_DATABASE_AUTH_TOKEN" "$db_token"
python3 "$UPSERTER" "$ENV_FILE" "APP_ORIGIN" "$APP_ORIGIN"
python3 "$UPSERTER" "$ENV_FILE" "APP_MARKETING_ORIGIN" "$APP_MARKETING_ORIGIN"
python3 "$UPSERTER" "$ENV_FILE" "APP_MARKETING_DOMAIN" "$marketing_domain"
python3 "$UPSERTER" "$ENV_FILE" "APP_COOKIE_SECURE" "true"

echo "Hydrated Turso connection into $ENV_FILE"
echo "Database URL: $db_url"
