import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAtlasTonePhrasing,
} from "./atlas-tone-phrasing.ts";

test("5A.4C Stage 3C leaves restrained security wording completely unchanged", () => {
  const answer =
    "I couldn't verify that security state, so I won't guess.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "security",
    tone: {
      mode: "restrained",
      humourAllowed: false,
    },
  });

  assert.equal(result, answer);
  assert.doesNotMatch(result, /detective|jargon|surprise/i);
});

test("5A.4C Stage 3C leaves restrained payment wording completely unchanged", () => {
  const answer =
    "I couldn't complete that TrustVault payment lookup right now.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "payment",
    tone: {
      mode: "restrained",
      humourAllowed: false,
    },
  });

  assert.equal(result, answer);
});

test("5A.4C Stage 3C leaves warm private-record wording unchanged", () => {
  const answer =
    "I found your Dinner with friends Bill Split. 3 of 5 shares are settled.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "bill-split",
    tone: {
      mode: "warm",
      humourAllowed: false,
    },
  });

  assert.equal(result, answer);
  assert.doesNotMatch(result, /detective/i);
});

test("5A.4C Stage 3C adds one light human touch to safe Gift Vault guidance", () => {
  const answer =
    "Gift Vault lets you prepare programmable USDC gifts.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "gift-vault",
    tone: {
      mode: "playful",
      humourAllowed: true,
    },
  });

  assert.ok(result.startsWith(answer));
  assert.match(result, /surprise land just right/i);
});

test("5A.4C Stage 3C adds restrained humour to safe Bill Split guidance", () => {
  const answer =
    "Bill Split helps organize shared expenses.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "bill-split",
    tone: {
      mode: "playful",
      humourAllowed: true,
    },
  });

  assert.ok(result.startsWith(answer));
  assert.match(result, /who still owes what/i);
  assert.match(result, /detective work/i);
});

test("5A.4C Stage 3C requires both playful mode and explicit humour permission", () => {
  const answer = "Gift Vault guidance is available.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "gift-vault",
    tone: {
      mode: "playful",
      humourAllowed: false,
    },
  });

  assert.equal(result, answer);
});

test("5A.4C Stage 3C never changes factual text already present in the answer", () => {
  const answer =
    "Bill Split supports shared expenses and the wallet remains the final approval point.";

  const result = applyAtlasTonePhrasing({
    answer,
    issueCategory: "bill-split",
    tone: {
      mode: "playful",
      humourAllowed: true,
    },
  });

  assert.ok(result.startsWith(answer));
});

test("5A.4C Stage 3C returns empty input safely without inventing content", () => {
  const result = applyAtlasTonePhrasing({
    answer: "   ",
    issueCategory: "general",
    tone: {
      mode: "playful",
      humourAllowed: true,
    },
  });

  assert.equal(result, "");
});
