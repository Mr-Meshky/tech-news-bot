import type { NewsItem, SourceResult } from "./types";
import { fetchAllRssFeeds, fetchTelegramChannels } from "./rss";
import { fetchGithubTrending } from "./github-trending";
import { fetchReddit } from "./reddit";
import { fetchYoutubeChannels } from "./youtube";

export type { NewsItem, SourceResult };

export async function fetchAllSources(): Promise<SourceResult> {
  console.log("[sources] Fetching all sources in parallel...");

  const results = await Promise.all([
    fetchAllRssFeeds(),
    fetchTelegramChannels(),
    fetchGithubTrending(),
    fetchReddit(),
    fetchYoutubeChannels(),
  ]);

  const items = results.flatMap((r) => r.items);
  const failedSources = results.flatMap((r) => r.failedSources);
  console.log(
    `[sources] Total raw items: ${items.length}` +
      (failedSources.length ? ` — failed: ${failedSources.join(", ")}` : "")
  );
  return { items, failedSources };
}
