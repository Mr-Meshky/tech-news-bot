import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashUrl } from "../src/storage/dedup";

test("hashUrl is 16 lowercase hex chars", () => {
  const hash = hashUrl("https://example.com/article");
  assert.match(hash, /^[0-9a-f]{16}$/);
});

test("hashUrl is deterministic", () => {
  assert.equal(hashUrl("https://a.com/x"), hashUrl("https://a.com/x"));
});

test("different URLs give different hashes", () => {
  assert.notEqual(hashUrl("https://a.com/x"), hashUrl("https://a.com/y"));
});
