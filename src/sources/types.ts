export type MediaType = "photo" | "video";

export interface NewsItem {
  url: string;
  title: string;
  /** HTML-stripped summary, max 500 chars */
  description: string;
  /** Human-readable source label, e.g. "TechCrunch", "Reddit r/technology" */
  source: string;
  /** ISO 8601 */
  publishedAt: string;
  /** Direct URL to an image or video to attach to the Telegram post */
  mediaUrl?: string;
  mediaType?: MediaType;
  /** Engagement hint (HN points, Reddit upvotes, GitHub stars) for curation */
  points?: number;
}

/** Result of one source fetch — items plus which sub-sources failed outright */
export interface SourceResult {
  items: NewsItem[];
  /** Source labels that errored (network/parse), for health tracking */
  failedSources: string[];
}
