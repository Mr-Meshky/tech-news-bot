import Parser from "rss-parser";
import type { NewsItem } from "./types";
import { config } from "../config";

interface FeedItemExtras {
  mediaContent?: { $?: { url?: string; medium?: string } };
  mediaThumbnail?: { $?: { url?: string } };
}

const parser: Parser<Record<string, never>, FeedItemExtras> = new Parser({
  timeout: config.fetchTimeoutMs,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; TechNewsBot/1.0)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
    ],
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov)(\?|$)/i;

/** Feeds often HTML-escape URLs (&amp;, &#038;) — Telegram can't fetch those. */
function decodeEntities(url: string): string {
  return url
    .replace(/&amp;/g, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

type FeedItem = Parser.Item & FeedItemExtras;

function extractMedia(item: FeedItem): Pick<NewsItem, "mediaUrl" | "mediaType"> {
  const candidates = [
    item.enclosure?.url,
    item.mediaContent?.$?.url,
    item.mediaThumbnail?.$?.url,
    // First <img src="..."> inside the HTML content
    /<img[^>]+src=["']([^"']+)["']/i.exec(item.content ?? "")?.[1],
  ];

  for (const raw of candidates) {
    if (!raw || !raw.startsWith("http")) continue;
    const url = decodeEntities(raw);
    if (VIDEO_EXT.test(url)) return { mediaUrl: url, mediaType: "video" };
    if (IMAGE_EXT.test(url)) return { mediaUrl: url, mediaType: "photo" };
    // enclosure/media:content without a recognizable extension — assume photo
    // only when the feed declares it as an image
    if (item.enclosure?.type?.startsWith("image/") && raw === item.enclosure.url) {
      return { mediaUrl: url, mediaType: "photo" };
    }
  }
  return {};
}

export async function fetchFeed(url: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? [])
      .filter((item) => Boolean(item.link))
      .map((item): NewsItem => ({
        url: item.link!,
        title: item.title?.trim() ?? "(no title)",
        description: stripHtml(
          item.contentSnippet ?? item.content ?? item.summary ?? ""
        ),
        source: sourceName,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
        ...extractMedia(item),
      }));
  } catch (err) {
    console.warn(
      `[rss] Failed to fetch "${sourceName}" (${url}):`,
      (err as Error).message
    );
    return [];
  }
}

export async function fetchAllRssFeeds(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    config.rssFeeds.map((feed) => fetchFeed(feed.url, feed.name))
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export async function fetchTelegramChannels(): Promise<NewsItem[]> {
  if (config.telegramChannels.length === 0) return [];

  const results = await Promise.allSettled(
    config.telegramChannels.map(async (username) => {
      for (const base of config.rsshubMirrors) {
        const items = await fetchFeed(`${base}/${username}`, `Telegram @${username}`);
        if (items.length > 0) return items;
      }
      return [] as NewsItem[];
    })
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
