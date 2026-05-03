# Development Log

## 2026-04-30 — Planning session

Researched stack options for pitomd.com landing page. Decided on pure HTML + CSS
(no build step) deployed to Cloudflare Pages. Rationale: single page, retro
aesthetic needs no tooling, zero dependencies, instant deploys.

Key decisions:

- No email signup (keeps it pure static, no third-party services)
- Dark/Dracula theme as default, light theme via toggle
- Terminal-style "status" block as main content
- GitHub + YouTube links as the only external references
- localStorage for theme persistence

Created `docs/plan.md` with full implementation spec. Next step: build
index.html and style.css.
