import type { NewsItem, SourceResult } from "./types";
import { fetchFeed } from "./rss";
import { config } from "../config";

/** youtube.com/watch?v=XXXX → XXXX */
function videoId(url: string): string | undefined {
  return /[?&]v=([\w-]{6,})/.exec(url)?.[1];
}

/**
 * Reads channels via YouTube's official RSS (no API key needed):
 * https://www.youtube.com/feeds/videos.xml?channel_id=UC...
 */
export async function fetchYoutubeChannels(): Promise<SourceResult> {
  if (config.youtubeChannels.length === 0)
    return { items: [], failedSources: [] };

  const items: NewsItem[] = [];
  const failedSources: string[] = [];
  await Promise.all(
    config.youtubeChannels.map(async (channelId) => {
      const label = `YouTube ${channelId}`;
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const found = await fetchFeed(feedUrl, label);
      if (found === null) {
        failedSources.push(label);
        return;
      }
      for (const item of found.slice(0, config.youtubeVideosPerChannel)) {
        const id = videoId(item.url);
        items.push({
          ...item,
          // Thumbnail as post media — the video itself stays behind the link
          ...(id
            ? {
                mediaUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                mediaType: "photo" as const,
              }
            : {}),
        });
      }
    })
  );
  console.log(
    `[youtube] Fetched ${items.length} videos from ${config.youtubeChannels.length} channels`
  );
  return { items, failedSources };
}
