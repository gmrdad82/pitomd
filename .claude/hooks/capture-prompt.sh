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
INBOX="$DIR/.claude/INBOX.md"

raw=$(cat)
prompt=$(printf '%s' "$raw" | ruby -rjson -e 'print((JSON.parse(STDIN.read)["prompt"] rescue ""))' 2>/dev/null)
# Never silent-drop: if JSON parse yielded nothing, capture the raw stdin so the
# message is still on the ledger (better a noisy block than a lost one).
[ -z "$prompt" ] && prompt="$raw"
[ -z "$prompt" ] && exit 0

# Best-effort secret masking (owner 2026-07-15): values following secret-y
# keywords are masked BEFORE the append, so keys/tokens pasted as
# `key=...` / `token: ...` never reach the ledger verbatim. This is the
# mechanical layer; CLAUDE.md instructs the model to redact anything
# semantic the regex can't know. Mask, never drop — capture stays whole.
prompt=$(printf '%s' "$prompt" | sed -E 's/((api[_-]?key|push[_-]?api[_-]?key|token|secret|password|webhook|bearer)[[:space:]"'"'"':=]+)[A-Za-z0-9_\/+.-]{8,}/\1[redacted]/Ig')

ts=$(date '+%Y-%m-%d %H:%M' 2>/dev/null || echo '?')
mkdir -p "$DIR/.claude" 2>/dev/null
{
  printf '\n## ⛔ UNPROCESSED — %s\n\n' "$ts"
  printf '%s\n' "$prompt"
} >> "$INBOX" 2>/dev/null

printf 'LOG LAW: a new owner message was captured to .claude/INBOX.md. Before acting, DRAIN every UNPROCESSED block into the active working plan (every todo, report, decision, discussion item) and keep checkboxes in sync. The working md is the only source of truth — never internal memory.\n'
exit 0
