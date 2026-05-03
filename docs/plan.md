# Pito Landing Page — Implementation Plan

## 1. Stack Recommendation

**Pure HTML + CSS (Option 1)**

Rationale:

- Single page with zero interactivity beyond a theme toggle (a few lines of JS)
- Monospace/retro aesthetic means no complex layout tooling needed
- Zero build step = instant Cloudflare Pages deploy (just serve the root)
- No dependencies to maintain, no node_modules, no package.json
- The design explicitly rejects decoration — utility classes add no value here
- Fastest possible load time (single HTML file, inline or single CSS file)
- Perfectly matches the "craigslist / 2000s tool" identity

The theme toggle requires ~15 lines of vanilla JS. No framework warranted.

## 2. File Structure

```
pito-website/
├── index.html          # The entire page
├── style.css           # Styles (design tokens as CSS custom properties)
├── favicon.ico         # Simple favicon (optional, can be emoji-based)
├── docs/               # Planning docs (not deployed)
│   ├── plan.md
│   └── log.md
├── CLAUDE.md
├── README.md
├── LICENSE
└── .gitignore
```

No build output directory. Cloudflare Pages serves from root `/`.

## 3. Deployment Setup (Cloudflare Pages)

**Configuration:**

- Build command: (none / leave empty)
- Build output directory: `/` (root of repo)
- Root directory: `/`
- Branch: `main`

**Setup steps:**

1. In Cloudflare Dashboard > Pages > Create a project
2. Connect GitHub repo `pito-website`
3. Framework preset: None
4. Build command: (blank)
5. Build output directory: `.` or `/`
6. Deploy

**Custom domain:**

- Add `pitomd.com` as custom domain in Pages project settings
- Update DNS: CNAME `pitomd.com` -> `<project>.pages.dev`
- Cloudflare handles SSL automatically

**Auto-deploy:** Every push to `main` triggers a new deployment (default
behavior).

## 4. Page Layout Mockup

```
┌─────────────────────────────────────────────────────────┐
│  [dark] [light]                              (top-right) │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│  pito                                                   │
│  ────                                                   │
│                                                         │
│  youtube channel management for engineers.              │
│                                                         │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │ $ pito status                           │            │
│  │                                         │            │
│  │ status: building                        │            │
│  │ eta:    soon                            │            │
│  │ ────────────────────────────────        │            │
│  │ the tool is under active development.   │            │
│  │ check back later.                       │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│                                                         │
│  [github]  [youtube]                                    │
│                                                         │
│                                                         │
│  ─────────────────────────────────────────              │
│  &copy; 2026 pito                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Content decisions:**

- No email signup (avoids needing a backend/service, keeps it pure static)
- Include GitHub link (if public repo exists) and YouTube link (the product
  domain)
- Terminal-style "status" block sells the engineering identity
- Theme toggle top-right using bracketed convention

## 5. Implementation Checklist

- [ ] Create `style.css` with CSS custom properties for both themes
- [ ] Create `index.html` with semantic markup
- [ ] Implement dark theme as default (`:root` variables)
- [ ] Add `[data-theme="light"]` override variables
- [ ] Add theme toggle JS (inline in HTML, ~15 lines)
- [ ] Persist theme choice in localStorage
- [ ] Respect `prefers-color-scheme` as initial value (but default dark)
- [ ] Add meta tags (title, description, og:image placeholder, viewport)
- [ ] Add favicon (text-based or emoji via SVG data URI)
- [ ] Test locally (just open index.html in browser)
- [ ] Push to main and verify Cloudflare Pages deploy
- [ ] Configure custom domain pitomd.com
- [ ] Verify SSL and DNS propagation

## 6. Design Tokens Reference

Use the **exact same CSS custom property names** as the Rails app for
cross-product consistency. If someone looks at both codebases, the tokens are
identical.

### Complete CSS Custom Properties (from Rails app)

```css
/* Light mode — Rails app :root */
:root {
  --color-bg: #ffffff;
  --color-bg-alt: #fafafa;
  --color-bg-hover: #f0f0f0;
  --color-bg-header: #f4f4f4;
  --color-text: #1a1a1a;
  --color-text-bold: #1a1a1a;
  --color-link: #0000cc;
  --color-link-hover: #0000ff;
  --color-danger: #cc0000;
  --color-muted: #555555;
  --color-border: #dddddd;
  --color-input-border: #999999;
  --color-success: #2e7d32;
}

/* Dark mode — Rails app [data-theme="dark"] */
[data-theme="dark"] {
  --color-bg: #282a36;
  --color-bg-alt: #21222c;
  --color-bg-hover: #44475a;
  --color-bg-header: #343746;
  --color-text: #f8f8f2;
  --color-text-bold: #f8f8f2;
  --color-link: #bd93f9;
  --color-link-hover: #d4b8ff;
  --color-danger: #ff5555;
  --color-muted: #6272a4;
  --color-border: #44475a;
  --color-input-border: #6272a4;
  --color-success: #50fa7b;
}
```

**Note:** The Rails app uses light as `:root` default and dark under
`[data-theme="dark"]`. For the website, we flip the default to dark (matching
product identity): dark variables go in `:root`, light variables go in
`[data-theme="light"]`.

### Typography

```css
:root {
  --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
  --font-size-base: 13px;
  --font-size-h1: 18px;
  --font-size-h2: 14px;
  --line-height: 1.4;
}
```

No CDN or font loading — pure system font stack only.

### Theme Toggle Implementation

- Inline `<script>` in `<head>` runs before page renders (prevents flash of
  wrong theme)
- Priority: localStorage `"pito-theme"` > `data-theme-preference` attribute >
  system preference via `matchMedia`
- Toggle saves to localStorage and sets `data-theme` on `<html>`
- Keycap trigger: `<a class="keycap keycap-theme">n</a>`

### Header Structure (32px fixed height)

- Logo left (14px height)
- Nav links with middot (`·`) separators
- Search input (200px) — omit for website since it's single-page
- Theme toggle `(n)` keycap right-aligned

### Footer (11px font-size)

- Nav links (same as header)
- Logo (10px height)
- Copyright + year
- Version label right-aligned

### Key CSS Patterns (from Rails app)

- `.bracketed` — links rendered as `[label]` using `::before` and `::after`
  pseudo-elements
- `.keycap` — parenthesized keyboard shortcut indicators like `(n)`
- `.text-muted` — uses `var(--color-muted)`
- `border-collapse: collapse` on tables
- Flash messages with specific bg/border/text per type (success, alert, notice)

### Rules

- No border-radius anywhere
- No box-shadow
- No gradients
- No icon fonts — HTML entities only (e.g. `&copy;` `&mdash;` `&#9608;`)
- Links styled as `[label]` with bracket characters:
  `[<span class="bl">label</span>]`
- Dense spacing, minimal padding
- All text monospace, no exceptions
- Red/danger color ONLY for destructive actions (not decorative)

## 7. Shared Assets

### Logo

**Source:** `pito/public/Pito.png` — a bold red "P" with white pixelated
play-button icon.

**Usage:**

- Copy `Pito.png` to website repo root (`pito-website/Pito.png`)
- Favicon: `<link rel="icon" href="/Pito.png" type="image/png">`
- Header: `<img src="/Pito.png" alt="pito" style="height: 14px;">` (matches
  Rails app)
- Footer: `<img src="/Pito.png" alt="pito" style="height: 10px;">` (matches
  Rails app)

### Implementation Checklist (assets)

- [ ] Copy `Pito.png` from `pito/public/Pito.png` into website repo root
- [ ] Use as favicon via `<link rel="icon">`
- [ ] Use in header at 14px height
- [ ] Use in footer at 10px height
- [ ] Theme default = dark (matching product identity)
- [ ] `.bracketed` renders as: `[<span class="bl">label</span>]` where brackets
      are literal characters
