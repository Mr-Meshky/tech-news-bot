import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { tehranNow, isQuietHour } from "../src/util/time";

test("converts UTC to Tehran time (+3:30)", () => {
  const t = tehranNow(new Date("2026-07-16T12:00:00Z"));
  assert.equal(t.hour, 15);
  assert.equal(t.weekday, "Thu");
  assert.equal(t.dateKey, "2026-07-16");
});

test("rolls over to the next Tehran day after 20:30 UTC", () => {
  const t = tehranNow(new Date("2026-07-16T20:31:00Z"));
  assert.equal(t.hour, 0);
  assert.equal(t.weekday, "Fri");
  assert.equal(t.dateKey, "2026-07-17");
});

test("quiet hours: simple window", () => {
  assert.equal(isQuietHour(1, 1, 8), true);
  assert.equal(isQuietHour(7, 1, 8), true);
  assert.equal(isQuietHour(8, 1, 8), false);
  assert.equal(isQuietHour(0, 1, 8), false);
});

test("quiet hours: window wrapping midnight", () => {
  assert.equal(isQuietHour(23, 23, 7), true);
  assert.equal(isQuietHour(3, 23, 7), true);
  assert.equal(isQuietHour(7, 23, 7), false);
  assert.equal(isQuietHour(12, 23, 7), false);
});
