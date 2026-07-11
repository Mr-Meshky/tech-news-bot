import type { NewsItem } from "./types";
import { config } from "../config";
import { fetchFeed } from "./rss";

/**
 * Reddit source via public RSS feeds (free, no auth).
 *
 * Reddit blocks its unauthenticated JSON API for most non-browser clients,
 * but the Atom/RSS endpoints (`/r/{sub}/top/.rss`) remain open. Post
 * thumbnails are embedded in the entry HTML and picked up by the shared
 * media extraction in rss.ts.
 */
export async function fetchReddit(): Promise<NewsItem[]> {
  if (config.redditSubreddits.length === 0) return [];

  const results = await Promise.allSettled(
    config.redditSubreddits.map((sub) =>
      fetchFeed(
        `https://www.reddit.com/r/${sub}/top/.rss?t=day&limit=${config.redditPostsPerSub}`,
        `Reddit r/${sub}`
      )
    )
  );
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  console.log(
    `[reddit] Fetched ${items.length} posts from ${config.redditSubreddits.length} subreddits`
  );
  return items;
}
