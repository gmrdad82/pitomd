#!/usr/bin/env bash
# enrich.sh — stage showcase data in the dev DB through NORMAL pito commands
# (typed into the real chatbox, same as a human): footage hours + a price on
# the coverage game, and IGDB re-syncs so unreleased titles carry per-platform
# release dates. Idempotent — re-running just re-sets the same values.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_URL="${BASE_URL:-https://dev.pitomd.com}"

"$DIR/.venv/bin/shot-scraper" javascript "$BASE_URL/" "
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = (text) => {
    const input = document.querySelector('.pito-chatbox__input');
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true,
    }));
  };
  await sleep(1500);
  send('footage update 1 12.5'); await sleep(4000);
  send('price set 1 39.99');     await sleep(4000);
  send('sync game #3');           await sleep(20000);
  send('sync game #1');           await sleep(20000);
  return 'enriched';
}" --auth "$DIR/auth-state.json"
