---
name: ci-watch
description: Watching a push to green — reading the pipeline, investigating red, triaging Dependabot, proposing fixes as diffs.
triggers: [CI, pipeline, GitHub Actions, red build, checks, Dependabot]
---

# CI watch

## Project context

Everything expensive rides tags (cost law): `ci.yml` ("Website CI" — the
`lint-and-audit` job is the REQUIRED status check on protected main, plus a
Lighthouse pass: a11y/SEO/best-practices ≥ 0.9 gated, performance ≥ 0.5
warns) and `deploy.yml` ("Deploy" → Cloudflare Pages) fire on `v*` tags.
`tag.yml` turns a `[vX.Y.Z]`-prefixed commit on main into that tag — the
release commit itself must carry the `npm version` bump (protected main
takes no bot commits) — then dispatches CI and Deploy. `announce.yml` rides
Deploy's completion (Slack/Discord). `publish-cron.yml` and
`buffer-check.yml` beat Mondays and Thursdays 08:00 UTC. `notify.yml`
reports run outcomes to the owner's Slack.

## Conventions

- Once the owner has confirmed a commit and a push, watch that push's runs
  to conclusion with `gh run list` / `gh run watch` — a push is not done on
  a red or unchecked pipeline. A `[vX.Y.Z]` push is not done until the tag
  exists AND the dispatched CI + Deploy both finish green.
- On red: pull the failing job's log (`gh run view <id> --log-failed`),
  find the first real failure (not the cascade), reproduce locally where
  possible (`npm run lint`, `npx astro check`, `npx vitest run`,
  `npm run build`), and report cause + a ready fix in the working tree.
- Distinguish clearly: our change broke it / flake (re-run once, say so) /
  pre-existing red. Never re-run repeatedly to make a real failure
  disappear. Lighthouse performance warnings are reported, not chased.
- Green is reported with the run URL and conclusion, not assumed from a
  passing local suite.
- Dependabot rides the same watch: check open alerts (`gh api
repos/{owner}/{repo}/dependabot/alerts --jq '.[] | select(.state ==
"open")'`) and Dependabot PRs (`gh pr list --author app/dependabot`).
  For each alert: name the package, the advisory, whether the vulnerable
  path is reachable in this static-site usage, and the minimal safe bump —
  every open alert acknowledged in the report, none silently skipped.
  Prefer targeted `npm install <pkg>@<version>` over blanket `npm update`;
  prove bumps with the full local gates plus `npm audit
--audit-level=high`. The owner merges Dependabot PRs and commits bumps.

## Anti-patterns

- "CI should pass" as a handover line.
- Fixing CI config itself to get past a legitimate failure.
- Dismissing a Dependabot alert as unreachable without showing the
  reasoning.
- Merging, tagging, or deploy decisions — those are the owner's.
