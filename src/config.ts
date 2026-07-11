import "dotenv/config";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function envList(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  telegramChannelId: requireEnv("TELEGRAM_CHANNEL_ID"),
  /** @username for post signature — derived from TELEGRAM_CHANNEL_ID if it starts with @ */
  get telegramChannelUsername() {
    const id = process.env["TELEGRAM_CHANNEL_ID"] ?? "";
    return id.startsWith("@") ? id : "";
  },
  geminiApiKey: requireEnv("GEMINI_API_KEY"),

  /** Batch size when refilling the post queue */
  maxPostsPerRun: 8,
  fetchTimeoutMs: 15_000,

  geminiModel: "gemini-2.5-flash" as const,
  geminiTemperature: 0.9,

  dedupPath: "data/posted.json",
  maxDedupEntries: 500,

  rssFeeds: [
    { url: "https://techcrunch.com/feed/",                    name: "TechCrunch"      },
    { url: "https://www.theverge.com/rss/index.xml",          name: "The Verge"       },
    { url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica"    },
    { url: "https://hnrss.org/frontpage",                     name: "Hacker News"     },
    { url: "https://www.wired.com/feed/rss",                  name: "Wired"           },
    { url: "https://www.technologyreview.com/feed/",          name: "MIT Tech Review" },
    { url: "https://www.zoomit.ir/feed/",                     name: "Zoomit"          },
  ] satisfies ReadonlyArray<{ url: string; name: string }>,

  // Reddit — free public JSON API, no auth needed
  redditSubreddits: envList("REDDIT_SUBREDDITS", [
    "technology",
    "programming",
    "artificial",
    "gadgets",
  ]),
  redditPostsPerSub: 5,

  // Source Telegram channels via RSSHub proxy (free public instance)
  telegramChannels: envList("TELEGRAM_CHANNELS", []),
  rsshubBase: "https://rsshub.app/telegram/channel",

  githubTrendingUrl: "https://github.com/trending",
  githubTrendingLimit: 5,
} as const;
