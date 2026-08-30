import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, "..");
const ESTATE_ROOT = join(REPO_ROOT, "..");
const UI_SRC = join(ESTATE_ROOT, "pito-ui", "js", "src");

const PAIRS = [
  {
    local: join("src", "styles", "tokens.css"),
    source: join(ESTATE_ROOT, "pito-ui", "assets", "tokens.css"),
  },
  {
    local: join("src", "styles", "brand.css"),
    source: join(UI_SRC, "brand", "brand.css"),
  },
  {
    local: join("src", "shared", "anim", "pointer.js"),
    source: join(UI_SRC, "anim", "pointer.js"),
  },
  {
    local: join("src", "shared", "anim", "parallax.js"),
    source: join(UI_SRC, "anim", "parallax.js"),
  },
  {
    local: join("src", "shared", "anim", "reveal.js"),
    source: join(UI_SRC, "anim", "reveal.js"),
  },
  {
    local: join("src", "shared", "anim", "scrollytell.js"),
    source: join(UI_SRC, "anim", "scrollytell.js"),
  },
  {
    local: join("src", "shared", "anim", "currency.js"),
    source: join(UI_SRC, "anim", "currency.js"),
  },
  {
    local: join("src", "shared", "anim", "brandmark.js"),
    source: join(UI_SRC, "anim", "brandmark.js"),
  },
  {
    local: join("src", "shared", "anim", "progress.js"),
    source: join(UI_SRC, "anim", "progress.js"),
  },
  {
    local: join("src", "shared", "anim", "aurora.js"),
    source: join(UI_SRC, "anim", "aurora.js"),
  },
  {
    local: join("src", "shared", "anim", "copy.js"),
    source: join(UI_SRC, "anim", "copy.js"),
  },
  {
    local: join("src", "shared", "anim", "sky-flock.js"),
    source: join(UI_SRC, "anim", "sky-flock.js"),
  },
  {
    local: join("src", "shared", "anim", "resting-wave.js"),
    source: join(UI_SRC, "anim", "resting-wave.js"),
  },
  {
    local: join("src", "shared", "said-and-done", "reveal.js"),
    source: join(UI_SRC, "said-and-done", "reveal.js"),
  },
];

describe("the shared copies stay byte-identical to their library source", () => {
  for (const pair of PAIRS) {
    it.skipIf(!existsSync(pair.source))(
      `${pair.local} matches its library source`,
      () => {
        const local = readFileSync(join(REPO_ROOT, pair.local), "utf8");
        const source = readFileSync(pair.source, "utf8");
        expect(local, `${pair.local} is stale — run bin/sync-shared`).toBe(
          source,
        );
      },
    );
  }
});
