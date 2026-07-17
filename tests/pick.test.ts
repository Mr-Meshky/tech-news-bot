import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickDiverse } from "../src/util/pick";
import type { NewsItem } from "../src/sources/types";

function item(source: string, n: number): NewsItem {
  return {
    url: `https://example.com/${source}/${n}`,
    title: `${source} item ${n}`,
    description: "",
    source,
    publishedAt: new Date().toISOString(),
  };
}

test("round-robins across sources", () => {
  const items = [item("a", 1), item("a", 2), item("b", 1), item("c", 1)];
  const picked = pickDiverse(items, 3);
  assert.deepEqual(
    picked.map((i) => i.source),
    ["a", "b", "c"]
  );
});

test("preserves per-source order in later rounds", () => {
  const items = [item("a", 1), item("a", 2), item("b", 1)];
  const picked = pickDiverse(items, 3);
  assert.deepEqual(
    picked.map((i) => i.title),
    ["a item 1", "b item 1", "a item 2"]
  );
});

test("stops when items run out", () => {
  const picked = pickDiverse([item("a", 1)], 5);
  assert.equal(picked.length, 1);
});

test("respects the total cap", () => {
  const items = [item("a", 1), item("a", 2), item("b", 1), item("b", 2)];
  assert.equal(pickDiverse(items, 2).length, 2);
});

test("empty input gives empty output", () => {
  assert.deepEqual(pickDiverse([], 3), []);
});
