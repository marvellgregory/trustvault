import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    if (
      specifier.startsWith("./") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.includes("/lib/atlas/")
    ) {
      return nextResolve(
        `${specifier.endsWith(".js") ? specifier.slice(0, -3) : specifier}.ts`,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const {
  ATLAS_SURFACE_SECURITY_NOTICE,
  getAtlasStarterPrompts,
  getAtlasSurfaceContract,
} = await import("./index.ts");

test("Atlas shell remains attached to the bottom-right mascot contract", () => {
  assert.deepEqual(getAtlasSurfaceContract("collapsed"), {
    state: "collapsed",
    placement: "bottom-right",
    mascotVisible: true,
    mascotAttachedToSurface: true,
  });
  assert.equal(getAtlasSurfaceContract("expanded").mascotVisible, true);
});

test("starter prompts are contextual and guidance-oriented", () => {
  assert.deepEqual(getAtlasStarterPrompts("/checkout"), [
    "How does Marketplace checkout work?",
    "Where can I find my orders?",
  ]);
  assert.deepEqual(getAtlasStarterPrompts("/payment-review"), [
    "What should I check before approval?",
    "How does wallet approval work?",
  ]);
  assert.ok(
    getAtlasStarterPrompts("/unknown").every(
      (prompt) => !/send|claim|pay|sign|approve for me/i.test(prompt),
    ),
  );
});

test("surface copy states the wallet secret and money-movement boundary", () => {
  assert.match(ATLAS_SURFACE_SECURITY_NOTICE, /Never share a seed phrase or private key/);
  assert.match(ATLAS_SURFACE_SECURITY_NOTICE, /never moves funds/);
});

test("shared integration preserves dialog, focus, and reduced-motion contracts", async () => {
  const [layout, shell, panel, styles] = await Promise.all([
    readFile(new URL("../../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/atlas/AtlasAssistantShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/atlas/AtlasAssistantPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /<AtlasAssistantShell \/>/);
  assert.match(shell, /dynamic\(/);
  assert.match(shell, /launcherRef\.current\?\.focus\(\)/);
  assert.match(panel, /role="dialog"/);
  assert.match(panel, /event\.key === "Escape"/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.atlas-mascot-image/);
});
