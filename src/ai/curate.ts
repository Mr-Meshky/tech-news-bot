import type { NewsItem } from "../sources/types";
import { config } from "../config";
import { generateJson } from "./client";
import { CATEGORIES, isCategory, type Category } from "../util/categories";

export interface CuratedItem {
  item: NewsItem;
  category: Category;
}

const SYSTEM_INSTRUCTION = `You are the news editor of a Persian tech-news Telegram channel.
You receive a numbered list of candidate news items and pick the best ones for today's batch.

Rules:
- Group items that cover the SAME story (even across different sources) and pick only ONE per story — the one from the most authoritative source or with the most detail.
- Rank by importance to a tech/programming audience: major product launches, AI breakthroughs, security incidents, big industry moves > minor updates, listicles, opinion pieces.
- Prefer a diverse mix of sources and categories over many items from one source.
- Use engagement numbers (points) as a signal, not the only criterion.
- Assign each selected item exactly one category from: ${CATEGORIES.join(", ")}.

Respond ONLY with JSON of this shape:
{"selected": [{"index": <number from the list>, "category": "<category>"}]}`;

interface CurationResponse {
  selected?: Array<{ index?: number; category?: string }>;
}

/**
 * One cheap Gemini pass that ranks candidates, drops same-story duplicates
 * across sources, and assigns a category. Returns null on failure so the
 * caller can fall back to round-robin picking.
 */
export async function curateItems(
  items: NewsItem[],
  count: number
): Promise<CuratedItem[] | null> {
  const candidates = items.slice(0, config.maxCurationCandidates);
  const list = candidates
    .map((item, i) => {
      const points = item.points !== undefined ? ` (points: ${item.points})` : "";
      const desc = item.description ? ` — ${item.description.slice(0, 150)}` : "";
      return `${i}. [${item.source}]${points} ${item.title}${desc}`;
    })
    .join("\n");

  const prompt = `Pick the best ${count} items (fewer is fine if quality is low):\n\n${list}`;

  try {
    const res = await generateJson<CurationResponse>(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
    });
    const selected = (res.selected ?? [])
      .filter(
        (s): s is { index: number; category?: string } =>
          typeof s.index === "number" &&
          s.index >= 0 &&
          s.index < candidates.length
      )
      .slice(0, count)
      .map((s) => ({
        item: candidates[s.index],
        category: (s.category && isCategory(s.category)
          ? s.category
          : "other") as Category,
      }));
    if (selected.length === 0) throw new Error("Curation returned no items");
    // De-dupe indices in case the model repeats one
    const seen = new Set<string>();
    return selected.filter(({ item }) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  } catch (err) {
    console.warn(`[curate] Falling back to round-robin:`, (err as Error).message);
    return null;
  }
}
