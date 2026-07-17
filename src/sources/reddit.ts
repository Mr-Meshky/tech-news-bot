import type { NewsItem, SourceResult } from "./types";
import { config } from "../config";

interface RedditPost {
  data: {
    title: string;
    url: string;
    selftext: string;
    permalink: string;
    ups?: number;
    preview?: { images?: Array<{ source?: { url?: string } }> };
    is_self?: boolean;
  };
}

// Browser UA avoids Reddit's bot-detection on the public JSON API
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchSubreddit(sub: string): Promise<NewsItem[] | null> {
  const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=${config.redditPostsPerSub}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(config.fetchTimeoutMs),
    });
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    const json = (await res.json()) as { data: { children: RedditPost[] } };
    return json.data.children.map(({ data: p }): NewsItem => ({
      url: p.is_self ? `https://www.reddit.com${p.permalink}` : p.url,
      title: p.title,
      description: p.selftext.slice(0, 500),
      source: `Reddit r/${sub}`,
      publishedAt: new Date().toISOString(),
      ...(typeof p.ups === "number" ? { points: p.ups } : {}),
      ...(p.preview?.images?.[0]?.source?.url
        ? {
            mediaUrl: p.preview.images[0].source.url.replace(/&amp;/g, "&"),
            mediaType: "photo" as const,
          }
        : {}),
    }));
  } catch (err) {
    console.warn(`[reddit] Failed to fetch r/${sub}:`, (err as Error).message);
    return null;
  }
}

export async function fetchReddit(): Promise<SourceResult> {
  if (config.redditSubreddits.length === 0)
    return { items: [], failedSources: [] };

  const items: NewsItem[] = [];
  const failedSources: string[] = [];
  for (let i = 0; i < config.redditSubreddits.length; i++) {
    // Stagger requests to avoid rate limiting
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    const sub = config.redditSubreddits[i];
    const found = await fetchSubreddit(sub);
    if (found === null) failedSources.push(`Reddit r/${sub}`);
    else items.push(...found);
  }
  console.log(
    `[reddit] Fetched ${items.length} posts from ${config.redditSubreddits.length} subreddits`
  );
  return { items, failedSources };
}
