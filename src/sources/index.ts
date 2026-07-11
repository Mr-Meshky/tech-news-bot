import type { NewsItem } from "./types";
import { fetchAllRssFeeds, fetchTelegramChannels } from "./rss";
import { fetchGithubTrending } from "./github-trending";
import { fetchReddit } from "./reddit";
import { fetchXAccounts } from "./x";

export type { NewsItem };

export async function fetchAllSources(): Promise<NewsItem[]> {
  console.log("[sources] Fetching all sources in parallel...");

  const [rssItems, telegramItems, trendingItems, redditItems, xItems] =
    await Promise.all([
      fetchAllRssFeeds(),
      fetchTelegramChannels(),
      fetchGithubTrending(),
      fetchReddit(),
      fetchXAccounts(),
    ]);

  const all = [
    ...rssItems,
    ...telegramItems,
    ...trendingItems,
    ...redditItems,
    ...xItems,
  ];
  console.log(`[sources] Total raw items: ${all.length}`);
  return all;
}
