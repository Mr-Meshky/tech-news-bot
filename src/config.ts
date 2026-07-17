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
  /** Optional: admin's private chat_id for health alerts (message @userinfobot to find yours) */
  telegramAdminChatId: process.env["TELEGRAM_ADMIN_CHAT_ID"] ?? "",
  geminiApiKey: requireEnv("GEMINI_API_KEY"),

  /** Batch size when refilling the post queue */
  maxPostsPerRun: 8,
  /** Max candidates handed to the Gemini curation pass (keeps the prompt small) */
  maxCurationCandidates: 60,
  /** How many times a post is retried (re-queued) after a failed send */
  maxSendAttempts: 3,
  fetchTimeoutMs: 15_000,

  /** No posts between these Tehran hours (inclusive start, exclusive end) */
  quietHoursStart: 1,
  quietHoursEnd: 8,

  geminiModel: "gemini-2.5-flash" as const,
  geminiTemperature: 0.9,

  dedupPath: "data/posted.json",
  maxDedupEntries: 500,
  archivePath: "data/archive.json",
  maxArchiveEntries: 300,
  statePath: "data/state.json",

  /** Consecutive failures before the admin gets pinged about a source */
  sourceFailureAlertThreshold: 3,

  /** Max chars of scraped article text passed to Gemini as extra context */
  maxArticleChars: 2_500,

  rssFeeds: [
    { url: "https://techcrunch.com/feed/",                    name: "TechCrunch"      },
    { url: "https://www.theverge.com/rss/index.xml",          name: "The Verge"       },
    { url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica"    },
    // points= filters out low-signal frontpage churn
    { url: "https://hnrss.org/frontpage?points=150",          name: "Hacker News"     },
    { url: "https://www.wired.com/feed/rss",                  name: "Wired"           },
    { url: "https://www.technologyreview.com/feed/",          name: "MIT Tech Review" },
    { url: "https://www.zoomit.ir/feed/",                     name: "Zoomit"          },
    { url: "https://www.producthunt.com/feed",                name: "Product Hunt"    },
    { url: "https://dev.to/feed",                             name: "Dev.to"          },
    { url: "https://lobste.rs/rss",                           name: "Lobsters"        },
    { url: "https://github.blog/feed/",                       name: "GitHub Blog"     },
    { url: "https://openai.com/news/rss.xml",                 name: "OpenAI"          },
    { url: "https://blog.google/technology/ai/rss/",          name: "Google AI"       },
  ] satisfies ReadonlyArray<{ url: string; name: string }>,

  // Reddit — free public JSON API, no auth needed
  redditSubreddits: envList("REDDIT_SUBREDDITS", [
    "technology",
    "programming",
    "artificial",
    "gadgets",
  ]),
  redditPostsPerSub: 5,

  // YouTube channel IDs (the UC... form) read via YouTube's official RSS
  youtubeChannels: envList("YOUTUBE_CHANNELS", []),
  youtubeVideosPerChannel: 3,

  // Source Telegram channels via RSSHub — tries mirrors in order until one works
  telegramChannels: envList("TELEGRAM_CHANNELS", []),
  rsshubMirrors: [
    "https://rsshub.app/telegram/channel",
    "https://rsshub.rssforever.com/telegram/channel",
    "https://rsshub.fly.dev/telegram/channel",
  ],

  githubTrendingUrl: "https://github.com/trending",
  githubTrendingLimit: 5,
} as const;
