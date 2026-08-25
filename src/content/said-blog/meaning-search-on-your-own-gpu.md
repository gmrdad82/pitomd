---
title: "Meaning search on your own GPU"
description: "Exact words find what you wrote. Meaning search finds what you meant — computed at home, sent nowhere."
published: false
pubDate: 2026-09-10
---

You wrote it down three weeks ago. You know it's in there. But you called it
"the licensing wrinkle" then and you're searching "key problem" now — and
exact-word search shrugs.

## Two legs, one search box

Said and Done. searches both ways at once. The exact leg covers card titles, bodies,
and the text inside every line range a card references — fast, literal,
reliable. Beside it runs a meaning leg: your markdown, chunked and embedded
into vectors on your own GPU, so "key problem" can find the licensing
wrinkle even though they share no words.

## Computed at home

The part we care about most is where this happens: at home. The embedding
model ships inside the app — nothing is downloaded at boot, and no text of
yours travels anywhere to become searchable. Your notes get indexed on your
machine, by your hardware, for you alone.

Which is also why Said and Done. is honest about what it needs: a real GPU.
The desk says so at the door — a machine without one is turned away plainly
at first boot, not strung along with a crippled mode. We would rather
require the hardware than quietly ship a worse desk.

## Warm-up without drama

On a machine that qualifies, the meaning leg still takes a moment to warm —
the engine loads, the index builds in the background, watching your folder
and re-embedding only what changed. Until it's warm, exact search answers
in full on its own: no errors, no nagging, no spinner theater. The finder
even tells you, in one quiet line, that meaning search joins once the
engine is ready.

Search that understands you used to cost a cloud. Now it costs a few hundred
megabytes of model weights and the GPU you already own.

![The finder over the board — an exact hit with its references counted](/said-and-done/shots/finder.png)

_One search box: exact words answer first, meaning joins from your own GPU._
