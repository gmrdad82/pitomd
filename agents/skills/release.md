---
name: release
description: The tag-from-commit-message release flow — how a [vX.Y.Z] commit becomes a tag, a deploy, and a green pipeline. The owner releases; agents prepare and watch.
triggers: [release, tag, version, deploy, "[v"]
---

# Release

## Project context

pitomd releases with the estate's tag-from-commit-message convention
(`.github/workflows/tag.yml`), in the flavor a protected main demands:
main only ever takes the owner's signed commits, so the bot never writes
to it — it only verifies and tags.

## Conventions

- A release is ONE commit on main whose message starts with `[vX.Y.Z]`
  followed by a narrative sentence in the repo voice:
  `[v0.9.2] The desk learns to …`. Everything shipping in the release
  rides that commit or earlier.
- **`bin/release` is the door the owner walks through**: stage what
  ships, run it, give the sentence — interactively, or inline with
  `-m "the sentence"` so an agent can hand a complete snippet. It
  computes the next version from the latest tag (patch by default;
  `X.Y.Z`, `--minor`, `--major` override; `--dry-run` previews), runs
  the prettier gate, bumps the manifest, commits `[vX.Y.Z] <sentence>`
  with the staged work folded in, and pushes. Agents never run it —
  they prepare the tree and hand the owner the staging list plus the
  `-m` line.
- **The release commit itself carries the manifest bump** — run
  `npm version X.Y.Z --no-git-tag-version` before committing (it rewrites
  package.json + package-lock.json only; the flag stops npm from cutting
  its own commit and tag). tag.yml VERIFIES the manifest matches the
  message and fails the release if it does not; it never bumps.
- On the push, tag.yml cuts annotated tag `vX.Y.Z` on that commit and
  dispatches Website CI and Deploy on the tag ref. Announce rides
  Deploy's completion by itself; while the publish freeze holds, it
  reports "nothing newly published".
- Run every local gate BEFORE handing the owner the release snippet —
  including `npx prettier --check .` over the whole tree, because CI's
  required `lint-and-audit` job checks every file, not just the ones the
  session touched.
- A release is DONE when: the tag exists, and the dispatched Website CI
  and Deploy both conclude green (ci-watch.md governs the watching). A
  red pipeline after a `[v…]` push is fixed by a follow-up plain commit
  on main and re-dispatching CI + Deploy on main — **never** by moving,
  deleting, or re-cutting the tag. A tag left a commit behind main is
  cosmetic and self-heals at the next release.
- The owner runs the release commit and push; version choice is his.
  Agents prepare the tree, hand the snippet, and watch.

## Anti-patterns

- Tagging by hand (`git tag …`) — the message convention is the only
  door.
- Reusing a `[vX.Y.Z]` whose tag already exists — tag.yml refuses it.
- Retagging or force-anything to make a tag match main.
- A `[v…]` commit that mixes the release with unreviewed new work.
