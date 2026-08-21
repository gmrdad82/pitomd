---
title: "Meaning search on your own GPU"
description: "Exact words find what you wrote. Meaning search finds what you meant — computed at home, sent nowhere."
published: false
pubDate: 2026-09-10
---

You wrote it down three weeks ago. You know it's in there. But you called it
"the licensing wrinkle" then and you're searching "key problem" now — and
exact-word search shrugs.

Said and Done searches both ways at once. The exact leg covers card titles, bodies,
and the text inside every line range a card references — fast, literal,
reliable. Beside it runs a meaning leg: your markdown, chunked and embedded
into vectors on your own GPU, so "key problem" can find the licensing
wrinkle even though they share no words.

The part we care about most is where this happens: at home. The embedding
model ships inside the app — nothing is downloaded at boot, and no text of
yours travels anywhere to become searchable. Your notes get indexed on your
machine, by your hardware, for you alone.

It's also built to fail politely. No usable GPU, or the model missing?
The meaning leg quietly contributes nothing and exact search still answers
in full — no errors, no nagging, no degraded-mode drama. The index keeps
itself current in the background, watching your folder and re-embedding only
what changed.

Search that understands you used to cost a cloud. Now it costs a few hundred
megabytes of model weights and the GPU you already own.
