import { config } from "../config";
import type { MediaType } from "../sources/types";
import type { Category } from "../util/categories";

const TELEGRAM_API = `https://api.telegram.org/bot${config.telegramBotToken}`;

/** Telegram caption limit for photos/videos (text messages allow 4096) */
const CAPTION_LIMIT = 1024;

export interface OutgoingPost {
  /** Gemini output — plain text, no link line */
  body: string;
  /** Article URL, shown as an inline "بیشتر بخون" button */
  linkUrl?: string;
  /** Original item title — kept for the archive & weekly digest */
  title?: string;
  /** Source label, e.g. "TechCrunch" — kept for the archive */
  source?: string;
  category?: Category;
  /** Pre-rendered hashtag line, e.g. "#هوش_مصنوعی #تکنولوژی" */
  hashtags?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  /** Failed-send counter — post is re-queued until maxSendAttempts */
  attempts?: number;
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

function renderHtml(post: OutgoingPost, opts: { preview: boolean }): string {
  const parts: string[] = [];
  // Invisible anchor (word joiner) triggers the link preview even though the
  // visible link now lives in the inline button below the post.
  if (opts.preview && post.linkUrl) {
    parts.push(`<a href="${escapeHtml(post.linkUrl)}">&#8288;</a>${escapeHtml(post.body)}`);
  } else {
    parts.push(escapeHtml(post.body));
  }
  if (post.hashtags) parts.push(escapeHtml(post.hashtags));
  if (SIGNATURE) parts.push(SIGNATURE);
  return parts.join("\n\n");
}

/** Visible length as Telegram counts it (link markup doesn't count, its label does) */
export function visibleLength(post: OutgoingPost): number {
  const hashtagsLen = post.hashtags ? post.hashtags.length + 2 : 0;
  const signatureLen = SIGNATURE ? SIGNATURE.length + 2 : 0;
  return post.body.length + hashtagsLen + signatureLen;
}

function linkButton(post: OutgoingPost): Record<string, unknown> {
  if (!post.linkUrl) return {};
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "بیشتر بخون 🔗", url: post.linkUrl }]],
    },
  };
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
    text: renderHtml(post, { preview: true }),
    parse_mode: "HTML",
    // Show the article's own preview when there's no attached media
    disable_web_page_preview: false,
    ...linkButton(post),
  });
}

function sendMedia(post: OutgoingPost): Promise<void> {
  const method = post.mediaType === "video" ? "sendVideo" : "sendPhoto";
  const mediaField = post.mediaType === "video" ? "video" : "photo";
  return callApi(method, {
    chat_id: config.telegramChannelId,
    [mediaField]: post.mediaUrl,
    caption: renderHtml(post, { preview: false }),
    parse_mode: "HTML",
    ...linkButton(post),
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

export function sendPoll(question: string, options: string[]): Promise<void> {
  return callApi("sendPoll", {
    chat_id: config.telegramChannelId,
    question,
    options,
    is_anonymous: true,
  });
}

/**
 * Health alert to the admin's private chat. Never throws — a broken alert
 * channel must not take down a posting run.
 */
export async function sendAdminMessage(text: string): Promise<void> {
  if (!config.telegramAdminChatId) return;
  try {
    await callApi("sendMessage", {
      chat_id: config.telegramAdminChatId,
      text: `🤖 tech-news-bot\n\n${text}`,
    });
  } catch (err) {
    console.warn(`[telegram] Admin alert failed:`, (err as Error).message);
  }
}
