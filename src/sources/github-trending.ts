import * as cheerio from "cheerio";
import type { NewsItem } from "./types";
import { config } from "../config";

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TechNewsBot/1.0)" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchGithubTrending(): Promise<NewsItem[]> {
  try {
    const html = await fetchHtml(config.githubTrendingUrl);
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];

    $("article.Box-row").each((_i, el) => {
      if (items.length >= config.githubTrendingLimit) return false;

      const $el = $(el);

      const relHref = $el.find("h2 a").attr("href")?.trim() ?? "";
      if (!relHref) return;
      const url = `https://github.com${relHref}`;

      const title = $el.find("h2 a").text().replace(/\s+/g, " ").trim();
      const description = $el.find("p").first().text().trim().slice(0, 500);

      const starsText = $el
        .find("[aria-label='stars']")
        .parent()
        .text()
        .trim()
        .replace(/,/g, "");
      const starsNum = parseInt(starsText, 10);
      const starsDisplay = !isNaN(starsNum)
        ? `⭐ ${starsNum.toLocaleString()} stars`
        : "";

      const fullDescription = [description, starsDisplay]
        .filter(Boolean)
        .join(" — ");

      items.push({
        url,
        title: `GitHub Trending: ${title}`,
        description: fullDescription,
        source: "GitHub Trending",
        publishedAt: new Date().toISOString(),
        // GitHub renders a social-preview card for every repo
        mediaUrl: `https://opengraph.githubassets.com/1${relHref}`,
        mediaType: "photo",
      });
    });

    console.log(`[github-trending] Fetched ${items.length} trending repos`);
    return items;
  } catch (err) {
    console.warn(`[github-trending] Failed:`, (err as Error).message);
    return [];
  }
}
