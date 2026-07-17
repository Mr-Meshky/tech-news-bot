import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCategory, hashtagsFor, CATEGORIES } from "../src/util/categories";

test("isCategory accepts every known category", () => {
  for (const c of CATEGORIES) assert.equal(isCategory(c), true);
});

test("isCategory rejects unknown values", () => {
  assert.equal(isCategory("bogus"), false);
  assert.equal(isCategory(""), false);
});

test("every category renders a hashtag line", () => {
  for (const c of CATEGORIES) {
    const tags = hashtagsFor(c);
    assert.match(tags, /^#/);
    assert.ok(tags.includes("#تکنولوژی"));
  }
});

test("'other' doesn't duplicate the generic hashtag", () => {
  assert.equal(hashtagsFor("other"), "#تکنولوژی");
});
