import type { NewsItem } from "./types";
import { config } from "../config";
import { fetchFeed } from "./rss";

/**
 * X (Twitter) source via Nitter RSS proxy.
 *
 * X's free API tier does not allow reading tweets, so the only zero-cost
 * option is a Nitter instance's RSS output. Public instances come and go;
 * set NITTER_BASE to a live one. When the instance is down this source
 * silently yields nothing and the rest of the pipeline is unaffected.
 */
export async function fetchXAccounts(): Promise<NewsItem[]> {
  if (config.xAccounts.length === 0) return [];

  const results = await Promise.allSettled(
    config.xAccounts.map((username) =>
      fetchFeed(`${config.nitterBase}/${username}/rss`, `X @${username}`)
    )
  );
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  console.log(`[x] Fetched ${items.length} posts from ${config.xAccounts.length} accounts`);
  return items;
}
