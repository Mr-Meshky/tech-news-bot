# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # run the bot once (posts one item to Telegram)
pnpm typecheck    # TypeScript type check, no emit
```

No test suite exists. There is no build step — `tsx` runs TypeScript directly.

## How the bot works

Each invocation (GitHub Actions cron, every 15 min) does exactly **one** thing: post one item to Telegram. The flow:

1. Load `data/queue.json` (pre-formatted posts waiting to go out)
2. If queue is empty → fetch all sources → deduplicate → send up to `maxPostsPerRun` (8) items through Gemini → save formatted posts to queue
3. Shift one post off the queue → send to Telegram → save queue back to `data/queue.json`
4. GitHub Actions commits `data/` back to the repo (this is the entire persistence layer — no database)

## State files

Both files live in `data/` and are committed to git by the Actions workflow after every run:

- `data/queue.json` — array of `OutgoingPost` objects ready to send (Gemini already ran)
- `data/posted.json` — rolling set of up to 500 URL hashes (SHA-256, first 16 hex chars) used for deduplication

Dedup happens **before** Gemini is called. Once an item is formatted it's marked seen even if the send fails, to avoid re-processing it.

## Architecture

```
src/
├── main.ts              # orchestrator: queue → refill → send
├── config.ts            # all env vars and constants in one place
├── sources/
│   ├── index.ts         # fans out to all sources in parallel, merges results
│   ├── rss.ts           # generic RSS parser (used for news sites + Telegram channels via RSSHub)
│   ├── reddit.ts        # Reddit public JSON API (no auth)
│   └── github-trending.ts  # cheerio scrape of github.com/trending
├── ai/
│   └── gemini.ts        # formats a NewsItem → Persian channel post (3-retry, diacritics stripped)
├── publisher/
│   └── telegram.ts      # sendPost: tries media first, falls back to text if caption > 1024 chars
└── storage/
    ├── queue.ts          # load/save data/queue.json
    └── dedup.ts          # load/save data/posted.json, hashUrl()
```

## Key design decisions

- **`config.ts` is the single source of truth** for all tunables (`maxPostsPerRun`, `geminiModel`, `rssFeeds` list, etc.). Adding a new RSS feed only requires editing the `rssFeeds` array there.
- **Telegram channels** are read via `https://rsshub.app/telegram/channel/{username}` (public RSSHub instance) — same `fetchFeed()` helper as regular RSS.
- **Gemini output rules** are enforced in the system prompt in `gemini.ts`: plain text only, no Markdown/HTML, no links, max 900 chars, no Arabic diacritics. The diacritics strip also runs as a post-process regex (`DIACRITICS`).
- **Media fallback**: if a post has a `mediaUrl` but the visible text length would exceed Telegram's 1024-char caption limit, or if the media upload fails, it falls back to `sendMessage` with link preview.
- **X/Twitter source was removed** — all public Nitter instances are down or bot-protected.

## Environment variables

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | — |
| `TELEGRAM_BOT_TOKEN` | ✅ | — |
| `TELEGRAM_CHANNEL_ID` | ✅ | — |
| `TELEGRAM_CHANNELS` | ❌ | (empty) |
| `REDDIT_SUBREDDITS` | ❌ | technology,programming,artificial,gadgets |
