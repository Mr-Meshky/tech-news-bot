import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleLength, type OutgoingPost } from "../src/publisher/telegram";

// setup-env sets TELEGRAM_CHANNEL_ID=@testchannel → signature is appended
const SIGNATURE = "@testchannel";

test("counts body + signature", () => {
  const post: OutgoingPost = { body: "hello" };
  assert.equal(visibleLength(post), "hello".length + 2 + SIGNATURE.length);
});

test("counts hashtag line when present", () => {
  const post: OutgoingPost = { body: "hello", hashtags: "#tag" };
  assert.equal(
    visibleLength(post),
    "hello".length + 2 + "#tag".length + 2 + SIGNATURE.length
  );
});

test("media/link fields don't change the visible length", () => {
  const bare: OutgoingPost = { body: "hello" };
  const full: OutgoingPost = {
    body: "hello",
    linkUrl: "https://example.com/very/long/url",
    mediaUrl: "https://example.com/img.jpg",
    mediaType: "photo",
  };
  assert.equal(visibleLength(bare), visibleLength(full));
});
