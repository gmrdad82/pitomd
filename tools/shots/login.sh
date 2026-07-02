#!/usr/bin/env bash
# login.sh — mint an authenticated Playwright storage-state for shot-scraper.
#
# Drives the real pito login: GET / for CSRF + cookies, blank POST /chat to
# mint a conversation, then `/login <TOTP>` — and converts the resulting
# pito_session cookie into auth-state.json for `shot-scraper --auth`.
#
# Dev pito accepts the fixed code 123456 (no TOTP); override PITO_LOGIN_CODE
# and BASE_URL to point elsewhere.
set -euo pipefail

BASE_URL="${BASE_URL:-https://dev.pitomd.com}"
code="${PITO_LOGIN_CODE:-123456}"
DIR="$(cd "$(dirname "$0")" && pwd)"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

page=$(curl -s -c "$JAR" "$BASE_URL/")
token=$(grep -o 'name="authenticity_token" value="[^"]*"' <<<"$page" \
  | head -1 | sed 's/.*value="//; s/"$//')
[[ -n "$token" ]] || { echo "no authenticity_token on $BASE_URL" >&2; exit 1; }

uuid=$(curl -s -b "$JAR" -c "$JAR" "$BASE_URL/chat" \
  --data-urlencode "input=" \
  --data-urlencode "authenticity_token=$token" | grep -o '"uuid":"[^"]*"' | sed 's/.*:"//; s/"$//')
[[ -n "$uuid" ]] || { echo "conversation mint failed" >&2; exit 1; }

curl -s -o /dev/null -b "$JAR" -c "$JAR" "$BASE_URL/chat" \
  --data-urlencode "input=/login $code" \
  --data-urlencode "uuid=$uuid" \
  --data-urlencode "authenticity_token=$token"

session=$(awk '$6 == "pito_session" { print $7 }' "$JAR" | tail -1)
[[ -n "$session" ]] || { echo "login failed — no pito_session cookie" >&2; exit 1; }

host=$(sed 's|https\?://||; s|/.*||' <<<"$BASE_URL")
cat > "$DIR/auth-state.json" << JSON
{
  "cookies": [
    {
      "name": "pito_session",
      "value": "$session",
      "domain": "$host",
      "path": "/",
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax",
      "expires": -1
    }
  ],
  "origins": []
}
JSON
echo "auth-state.json written (conversation $uuid)"
