---
title: "Run your homelab like you mean it"
description: "Services, upgrades, and the 2am fix you'll forget — filed where future-you will look."
published: false
pubDate: 2026-11-27
---

Every homelab has two states: working mysteriously, and broken
mysteriously. The difference between hobby and infrastructure is a record.

## A page per service, notes per box

`services/` notes hold the how: compose files explained, port maps, the
backup dance. Cards hold the doing: "move Jellyfin to the new disk,"
referencing the service's note. The Overview shows what touches what
before you touch anything.

## The 2am rule

Fixed something at 2am? One comment on the page before bed — even three
words. Future-you at the next outage will read that thread first, and
past-you will finally have been useful.

![The Overview of services and their notes](/said-and-done/shots/overview.png)

_The blast radius, visible: which notes — and which pages — hang off the box you're about to reboot._

## Upgrades stop being roulette

The upgrade page cites the release notes lines that matter; the thread
records what broke last time. Your lab develops institutional memory, even
with an institution of one.
