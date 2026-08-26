import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const FORBIDDEN_MUTATION_STRINGS = [
  "eth_sendTransaction",
  "wallet_sendTransaction",
  "eth_sign",
  "personal_sign",
  "writeContract",
  "sendTransaction",
];

test("Atlas implementation contains no wallet mutation or signing operations", async () => {
  const directory = new URL("./", import.meta.url);
  const files = (await readdir(directory)).filter(
    (file) => file.endsWith(".ts") && !file.includes(".test."),
  );

  for (const file of files) {
    const source = await readFile(new URL(file, directory), "utf8");
    for (const forbidden of FORBIDDEN_MUTATION_STRINGS) {
      assert.equal(source.includes(forbidden), false, `${file} contains ${forbidden}`);
    }
  }
});
