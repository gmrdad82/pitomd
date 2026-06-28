#!/usr/bin/env sh
# UserPromptSubmit hook — mechanical capture of EVERY owner message.
#
# Appends the owner's verbatim prompt (timestamped, flagged UNPROCESSED) to the
# working INBOX so nothing the owner says can be lost to the model's memory or a
# context compaction. The model must later DRAIN each UNPROCESSED block into the
# active plan (todos/decisions/discussion) and mark it processed; the Stop hook
# (check-inbox.sh) refuses to end the turn until it does.
#
# MUST exit 0 on every path — a non-zero UserPromptSubmit hook would BLOCK the
# owner's prompt. The trailing stdout line is injected into the model's context
# as a reminder each turn.

DIR="${CLAUDE_PROJECT_DIR:-.}"
INBOX="$DIR/docs/claude/INBOX.md"

raw=$(cat)
prompt=$(printf '%s' "$raw" | ruby -rjson -e 'print((JSON.parse(STDIN.read)["prompt"] rescue ""))' 2>/dev/null)
# Never silent-drop: if JSON parse yielded nothing, capture the raw stdin so the
# message is still on the ledger (better a noisy block than a lost one).
[ -z "$prompt" ] && prompt="$raw"
[ -z "$prompt" ] && exit 0

ts=$(date '+%Y-%m-%d %H:%M' 2>/dev/null || echo '?')
mkdir -p "$DIR/docs/claude" 2>/dev/null
{
  printf '\n## ⛔ UNPROCESSED — %s\n\n' "$ts"
  printf '%s\n' "$prompt"
} >> "$INBOX" 2>/dev/null

printf 'LOG LAW: a new owner message was captured to docs/claude/INBOX.md. Before acting, DRAIN every UNPROCESSED block into the active working plan (every todo, report, decision, discussion item) and keep checkboxes in sync. The working md is the only source of truth — never internal memory.\n'
exit 0
