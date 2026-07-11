import { config } from "../config";
import type { MediaType } from "../sources/types";

const TELEGRAM_API = `https://api.telegram.org/bot${config.telegramBotToken}`;

/** Telegram caption limit for photos/videos (text messages allow 4096) */
const CAPTION_LIMIT = 1024;

export interface OutgoingPost {
  /** Gemini output — plain text, no link line */
  body: string;
  /** Article URL, rendered as a hyperlink on "بیشتر بخون" */
  linkUrl: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

interface TelegramResponse {
  ok: boolean;
  error_code?: number;
  description?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Channel signature appended to every post (only works with @username channels) */
const SIGNATURE = config.telegramChannelId.startsWith("@")
  ? config.telegramChannelId
  : "";

function renderHtml(post: OutgoingPost): string {
  const parts = [
    escapeHtml(post.body),
    `🔗 <a href="${escapeHtml(post.linkUrl)}">بیشتر بخون</a>`,
  ];
  if (SIGNATURE) parts.push(SIGNATURE);
  return parts.join("\n\n");
}

/** Visible length as Telegram counts it (link markup doesn't count, its label does) */
function visibleLength(post: OutgoingPost): number {
  const signatureLen = SIGNATURE ? SIGNATURE.length + 2 : 0;
  return post.body.length + "\n\n🔗 بیشتر بخون".length + signatureLen;
}

async function callApi(method: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as TelegramResponse;
  if (!data.ok) {
    throw new Error(
      `Telegram ${method} error ${data.error_code ?? res.status}: ${data.description}`
    );
  }
}

function sendText(post: OutgoingPost): Promise<void> {
  return callApi("sendMessage", {
    chat_id: config.telegramChannelId,
    text: renderHtml(post),
    parse_mode: "HTML",
    // Show the article's own preview when there's no attached media
    disable_web_page_preview: false,
  });
}

function sendMedia(post: OutgoingPost): Promise<void> {
  const method = post.mediaType === "video" ? "sendVideo" : "sendPhoto";
  const mediaField = post.mediaType === "video" ? "video" : "photo";
  return callApi(method, {
    chat_id: config.telegramChannelId,
    [mediaField]: post.mediaUrl,
    caption: renderHtml(post),
    parse_mode: "HTML",
  });
}

export async function sendPost(post: OutgoingPost): Promise<void> {
  // Media captions are limited to 1024 chars — fall back to a text message
  // (with link preview) rather than truncating the Persian text mid-sentence.
  if (post.mediaUrl && visibleLength(post) <= CAPTION_LIMIT) {
    try {
      await sendMedia(post);
      return;
    } catch (err) {
      // Telegram may reject the media URL (too large, dead link, wrong type) —
      // the post itself is still worth sending as plain text.
      console.warn(
        `[telegram] Media send failed, falling back to text:`,
        (err as Error).message
      );
    }
  }
  await sendText(post);
}
