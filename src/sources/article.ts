import * as cheerio from "cheerio";
import { config } from "../config";

/**
 * Best-effort scrape of an article's body text so Gemini can analyse the
 * full story instead of just the RSS title + summary. Returns "" on any
 * failure — the caller falls back to the feed description.
 */
export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(config.fetchTimeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return "";

    const $ = cheerio.load(await res.text());
    $("script, style, nav, header, footer, aside, form, iframe").remove();

    // Prefer semantic containers; fall back to the whole body
    const container = ["article", "main", '[role="main"]', "body"]
      .map((sel) => $(sel).first())
      .find((el) => el.length > 0 && el.find("p").length >= 2);
    if (!container) return "";

    const paragraphs: string[] = [];
    container.find("p").each((_i, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length >= 40) paragraphs.push(text);
    });

    return paragraphs.join("\n").slice(0, config.maxArticleChars);
  } catch {
    return "";
  }
}
