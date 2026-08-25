---
title: "Two devices, one licence, zero sync services"
description: "The desktop owns the data; the phone rides your tunnel. Nobody in the middle."
published: false
pubDate: 2026-12-13
---

Every sync service is a third roommate reading your notes. The desk's
answer: don't sync — _visit_.

## The desktop is the single source

One machine owns the database and the notes folder. The remote client
serves the same desk over your own tunnel — cloudflared, tailscale,
ngrok — token-protected, alive only while the window is open.

## The phone is a window, not a copy

Nothing to reconcile, no conflict dialogs, no eventual consistency —
because there's exactly one desk. Close the window, and the remote goes
dark. That's a feature: attack surface you can reason about.

![The remote client riding the same desk](/said-and-done/shots/remote/r-board-dark.png)

_The same cards, through your own tunnel — no service in the middle._

## Where the licence fits

Free runs the whole desk with friendly caps. One 4.99€ key lifts every cap
on two devices — the laptop and the desktop, say — moved freely when
hardware changes. Pay once; own it like the data.
