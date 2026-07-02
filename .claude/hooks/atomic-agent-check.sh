#!/bin/sh
# PreToolUse hook (Agent / Task / Workflow): enforce CLAUDE.md's "one atomic task
# per sub-agent" rule. Thin wrapper — execs the python so the tool-call JSON on
# stdin flows straight through (a heredoc here would steal stdin). See the .py.
exec python3 "$(dirname "$0")/atomic-agent-check.py"
