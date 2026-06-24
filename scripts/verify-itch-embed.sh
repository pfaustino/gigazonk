#!/usr/bin/env bash
# Verify the live itch.io HTML5 embed serves the expected GAME_VERSION.
# Fails when butler metadata updates but the embed iframe still serves an old build
# (often caused by a legacy manual zip upload blocking the html5 channel).
set -euo pipefail

EXPECTED="${1:?usage: verify-itch-embed.sh <version> [page-url]}"
PAGE_URL="${2:-https://pfaustino.itch.io/gigazonk}"
WHARF_URL="https://api.itch.io/wharf/latest?target=pfaustino/gigazonk&channel_name=html5"
MAX_ATTEMPTS="${VERIFY_ITCH_ATTEMPTS:-12}"
WAIT_SEC="${VERIFY_ITCH_WAIT_SEC:-15}"

verify_wharf() {
  local latest
  latest=$(curl -fsSL "$WHARF_URL" | sed -n 's/.*"latest"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  if [[ "$latest" != "$EXPECTED" ]]; then
    echo "wharf latest=$latest (expected $EXPECTED)"
    return 1
  fi
  echo "wharf latest=$latest"
}

verify_embed() {
  local page embed_url index_html js_path js_url js_file

  page=$(curl -fsSL "$PAGE_URL")
  embed_url=$(echo "$page" | grep -oE 'https://html-classic\.itch\.zone/html/[0-9]+-[0-9]+/index\.html\?v=[0-9]+' | head -1)
  if [[ -z "$embed_url" ]]; then
    echo "Could not find html-classic embed URL on $PAGE_URL"
    return 1
  fi
  echo "embed index: $embed_url"

  index_html=$(curl -fsSL "$embed_url")
  js_path=$(echo "$index_html" | grep -oE '\./assets/index-[^"]+\.js' | head -1 | sed 's|^\./||')
  if [[ -z "$js_path" ]]; then
    echo "Could not find JS bundle path in embed index.html"
    return 1
  fi

  js_url="${embed_url%/index.html*}/${js_path}"
  echo "embed js: $js_url"
  js_file=$(mktemp)
  curl -fsSL "$js_url" -o "$js_file"

  if ! grep -qF "$EXPECTED" "$js_file"; then
    echo "Embed JS does not contain version $EXPECTED"
    rm -f "$js_file"
    return 1
  fi
  echo "Embed JS contains version $EXPECTED"
  rm -f "$js_file"
}

echo "Verifying itch.io embed for version $EXPECTED"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "Attempt $attempt/$MAX_ATTEMPTS"
  wharf_ok=0
  embed_ok=0
  verify_wharf && wharf_ok=1 || true
  verify_embed && embed_ok=1 || true

  if [[ "$wharf_ok" -eq 1 && "$embed_ok" -eq 1 ]]; then
    echo "itch.io embed verification passed"
    exit 0
  fi

  if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    echo "Waiting ${WAIT_SEC}s for itch.io processing..."
    sleep "$WAIT_SEC"
  fi
done

cat <<EOF
itch.io embed verification failed after $MAX_ATTEMPTS attempts.

Butler may report success while the "Play in browser" embed still serves an old build.
Common fix:
  1. itch.io → Edit game → delete the stale HTML5 upload (e.g. gigazonk-html5.zip)
  2. Save, then re-run the "Deploy to itch.io" workflow

See docs/adr/0005-itch-io-deploy.md (Stale embed troubleshooting).
EOF
exit 1
