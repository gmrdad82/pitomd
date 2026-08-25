---
title: "Triage bugs where the code can hear"
description: "Bug cards that reference the design notes — triage that leaves a trail better than labels."
published: false
pubDate: 2026-12-08
---

Bug trackers know severity and assignee. They rarely know _why the code is
the way it is_ — that lives in your notes, unlinked.

## File the bug against the thinking

The bug card references the design note that made the tradeoff. Triage
stops being archaeology: read the card, hit `r`, and the original
reasoning is in front of you before you judge the bug.

## Lanes are the only status you need

Backlog is triage. Todo is accepted. In progress means a human is on it.
Done carries the honest verdicts — fixed, abandoned, or not relevant when
the feature it haunted got removed.

![A card citing the lines behind the behavior](/said-and-done/shots/card.png)

_The bug and the design decision that spawned it, on one sheet._

## Your agent does the sweep

Over MCP: "file a card per FIXME under src/, referencing each line."
Twenty minutes of grunt work, done under the agent's own name, reviewable
in the dossier before you accept any of it.
