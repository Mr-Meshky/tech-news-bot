import Parser from "rss-parser";
import type { NewsItem, SourceResult } from "./types";
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

/** hnrss embeds "Points: 152" in the item body — a useful curation signal */
function extractPoints(item: FeedItem): number | undefined {
  const match = /Points:\s*(\d+)/.exec(item.content ?? item.contentSnippet ?? "");
  return match ? Number(match[1]) : undefined;
}

/** Returns null on fetch/parse failure so callers can track source health. */
export async function fetchFeed(
  url: string,
  sourceName: string
): Promise<NewsItem[] | null> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? [])
      .filter((item) => Boolean(item.link))
      .map((item): NewsItem => {
        const points = extractPoints(item);
        return {
          url: item.link!,
          title: item.title?.trim() ?? "(no title)",
          description: stripHtml(
            item.contentSnippet ?? item.content ?? item.summary ?? ""
          ),
          source: sourceName,
          publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          ...extractMedia(item),
          ...(points !== undefined ? { points } : {}),
        };
      });
  } catch (err) {
    console.warn(
      `[rss] Failed to fetch "${sourceName}" (${url}):`,
      (err as Error).message
    );
    return null;
  }
}

export async function fetchAllRssFeeds(): Promise<SourceResult> {
  const items: NewsItem[] = [];
  const failedSources: string[] = [];
  const results = await Promise.all(
    config.rssFeeds.map(async (feed) => ({
      name: feed.name,
      items: await fetchFeed(feed.url, feed.name),
    }))
  );
  for (const r of results) {
    if (r.items === null) failedSources.push(r.name);
    else items.push(...r.items);
  }
  return { items, failedSources };
}

export async function fetchTelegramChannels(): Promise<SourceResult> {
  if (config.telegramChannels.length === 0)
    return { items: [], failedSources: [] };

  const items: NewsItem[] = [];
  const failedSources: string[] = [];
  await Promise.all(
    config.telegramChannels.map(async (username) => {
      const label = `Telegram @${username}`;
      for (const base of config.rsshubMirrors) {
        const found = await fetchFeed(`${base}/${username}`, label);
        if (found && found.length > 0) {
          items.push(...found);
          return;
        }
      }
      failedSources.push(label);
    })
  );
  return { items, failedSources };
}
