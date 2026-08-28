import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const source =
  await fs.readFile(
    new URL(
      "./handler.cjs",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "live Lambda preserves GET /health before authenticated initialization",
  () => {
    const handlerStart =
      source.indexOf(
        "async function handler(event)",
      );

    const healthRoute =
      source.indexOf(
        'path.endsWith("/health")',
        handlerStart,
      );

    const webOriginValidation =
      source.indexOf(
        "TRUSTVAULT_WEB_ORIGIN",
        handlerStart,
      );

    assert.ok(
      handlerStart >= 0,
      "live handler must exist",
    );

    assert.ok(
      healthRoute > handlerStart,
      "health route must exist in live handler",
    );

    assert.ok(
      webOriginValidation > healthRoute,
      "health must execute before authenticated origin initialization",
    );
  },
);

test(
  "health checks the existing TrustVaultPilot health record",
  () => {
    assert.match(
      source,
      /SYSTEM#HEALTH/,
    );

    assert.match(
      source,
      /SK:\s*\{\s*S:\s*"CHECK"/,
    );

    assert.match(
      source,
      /databaseConnected:\s*true/,
    );
  },
);

test(
  "health reports DynamoDB failure without exposing internals",
  () => {
    assert.match(
      source,
      /statusCode:\s*503/,
    );

    assert.match(
      source,
      /databaseConnected:\s*false/,
    );

    assert.doesNotMatch(
      source,
      /error\.stack/,
    );
  },
);
