#!/usr/bin/env python3
"""PreToolUse hook for the Agent / Task / Workflow tools — mechanically enforces
CLAUDE.md's "one atomic task per sub-agent" rule so it can't be rationalized away.

Fires on EVERY sub-agent / workflow dispatch (reads the tool call JSON on stdin):
  - always injects the atomic-check reminder (deterministic, unmissable), and
  - BLOCKS (exit 2) a dispatch that names 2+ distinct buildable deliverables
    (e.g. a component AND a controller) — the exact failure to split.

Tunable: edit ARTIFACTS. A false-positive block just means "split it or do it
inline" — which is the rule anyway.
"""
import sys
import json
import re

REMINDER = (
    "ATOMIC-AGENT CHECK (CLAUDE.md, non-negotiable): a task is ONE deliverable. "
    "A ViewComponent, its Stimulus controller, and its specs are SEPARATE tasks — "
    "separate dispatches, or done inline. There is NO 'cohesive feature' exception. "
    "Confirm THIS dispatch is a single deliverable before proceeding."
)

ARTIFACTS = {
    "component":  r"viewcomponent|view component|\bcomponent\b",
    "controller": r"controller|stimulus",
    "service":    r"\bservice\b",
    "job":        r"\bjob\b",
    "rake":       r"rake task|\.rake\b|rake namespace",
    "migration":  r"\bmigration\b",
    "model":      r"\bmodel\b",
}


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    if data.get("tool_name", "") not in ("Agent", "Task", "Workflow"):
        return 0

    ti = data.get("tool_input", {}) or {}
    text = " ".join(str(ti.get(k, "")) for k in ("prompt", "description", "script")).lower()

    hits = sorted({name for name, pat in ARTIFACTS.items() if re.search(pat, text)})
    specs = bool(re.search(r"\bspec(s)?\b|vitest|rspec", text))

    if len(hits) >= 2:
        msg = (REMINDER + "\n\nBLOCKED: this dispatch names multiple deliverables — "
               + ", ".join(hits) + (" + specs" if specs else "")
               + ".\nSplit into one-deliverable dispatches, or do them inline.")
        print(msg, file=sys.stderr)
        return 2  # block the tool call; stderr is shown as feedback

    print(json.dumps({
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": REMINDER}
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
