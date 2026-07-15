#!/usr/bin/env sh
# Stop hook — refuses to end the turn while the INBOX has UNPROCESSED owner items.
#
# This is the teeth: the model cannot stop until every captured message has been
# drained into the active plan and its UNPROCESSED marker cleared. Exit 2 blocks
# the stop and feeds stderr back to the model; exit 0 allows it.
#
# Respects stop_hook_active so it can never trap the model in a loop.

DIR="${CLAUDE_PROJECT_DIR:-.}"
INBOX="$DIR/.claude/INBOX.md"

input=$(cat 2>/dev/null)
# Already inside a stop-hook continuation → don't re-block (loop guard).
printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0

if [ -f "$INBOX" ] && grep -q '^## .*UNPROCESSED' "$INBOX"; then
  echo "BLOCKED by log law: .claude/INBOX.md still has UNPROCESSED owner message(s). Drain each into the active working plan (todos/decisions/discussion), then change its '⛔ UNPROCESSED' heading to '✅ processed' (or remove the block) before stopping." >&2
  exit 2
fi
exit 0
