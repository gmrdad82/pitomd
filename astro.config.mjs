// @ts-check
import { defineConfig } from "astro/config";

// pitomd.com — the marketing/landing site for Pito.
//
// Static output, deployed to Cloudflare Pages via the deploy workflow in
// .github/workflows/. No SSR, no server runtime. Single page now
// ("under construction" placeholder); future work adds pages under src/pages/.
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
  devToolbar: {
    enabled: false,
  },
});
