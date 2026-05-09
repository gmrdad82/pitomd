// @ts-check
import { defineConfig } from "astro/config";

// Pito apex marketing site — pitomd.com.
//
// Static output, deployed to Cloudflare Pages via the `deploy-website`
// GitHub Actions workflow at the repo root. No SSR, no server runtime.
// Single page now ("under construction" placeholder); future Theta-phase
// work adds pages under `src/pages/`.
export default defineConfig({
  output: "static",
  site: "https://pitomd.com",
  trailingSlash: "ignore",
  build: {
    // Inline small stylesheets so the under-construction page ships as
    // (effectively) a single HTML document — keeps the surface minimal
    // while Cloudflare Pages still gets a normal Astro `dist/` tree.
    inlineStylesheets: "auto",
  },
  // Pito convention: dev servers live in the 3027-3029 range alongside the
  // Rails web (3027) and MCP (3028) Pumas. Cloudflared routes
  // `local.pitomd.com` to this port so hot-reload works without leaking
  // a localhost port number into the URL.
  server: {
    host: "127.0.0.1",
    port: 3029,
  },
  devToolbar: {
    enabled: false,
  },
});
