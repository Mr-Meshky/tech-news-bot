import type { NewsItem } from "../sources/types";

/**
 * Round-robin across sources so each contributes ~equally to a batch.
 * Preserves per-source order (most recent first within each source).
 * Fallback path when the Gemini curation pass is unavailable.
 */
export function pickDiverse(items: NewsItem[], total: number): NewsItem[] {
  const bySource = new Map<string, NewsItem[]>();
  for (const item of items) {
    const bucket = bySource.get(item.source) ?? [];
    bucket.push(item);
    bySource.set(item.source, bucket);
  }
  const buckets = [...bySource.values()];
  const result: NewsItem[] = [];
  for (let round = 0; result.length < total; round++) {
    let anyLeft = false;
    for (const bucket of buckets) {
      if (round < bucket.length) {
        result.push(bucket[round]);
        anyLeft = true;
        if (result.length >= total) break;
      }
    }
    if (!anyLeft) break;
  }
  return result;
}
