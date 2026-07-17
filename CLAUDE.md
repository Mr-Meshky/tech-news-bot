# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # run the bot once (posts one item to Telegram)
pnpm typecheck    # TypeScript type check, no emit (src/ only)
pnpm test         # node:test suite for the pure helpers (tests/)
```

There is no build step — `tsx` runs TypeScript directly. Tests run through `node --import tsx --test`; `tests/setup-env.ts` must stay the first import in every test file because `config.ts` reads required env vars at import time.

## How the bot works

Each invocation (GitHub Actions cron, every 3 hours) posts exactly **one** thing to Telegram. The flow:

1. Skip entirely during Tehran quiet hours (`quietHoursStart`–`quietHoursEnd`, default 1–8 AM)
2. If a weekly **special** is due (Friday digest / Monday repo spotlight / Wednesday poll, all Tehran time), post it instead of a news item and exit
3. Load `data/queue.json` (pre-formatted posts waiting to go out)
4. If queue is empty → fetch all sources → URL-dedup → **Gemini curation pass** (importance ranking, cross-source same-story dedup, category assignment; falls back to round-robin `pickDiverse` on failure) → scrape each article's body text → format each through Gemini → save to queue
5. Shift one post off the queue → send to Telegram (inline "بیشتر بخون" button + hashtag line) → append to `data/archive.json`
6. On send failure the post is re-queued with an `attempts` counter and dropped after `maxSendAttempts` (3)
7. GitHub Actions commits `data/` back to the repo (this is the entire persistence layer — no database)

## State files

All live in `data/` and are committed to git by the Actions workflow after every run:

- `data/queue.json` — array of `OutgoingPost` objects ready to send (Gemini already ran)
- `data/posted.json` — rolling set of up to 500 URL hashes (SHA-256, first 16 hex chars) used for deduplication
- `data/archive.json` — rolling list of up to 300 successfully-posted items (title/url/source/category/postedAt); feeds the weekly digest, polls, and `docs/index.html`
- `data/state.json` — consecutive per-source failure counts + last-run dates for the weekly specials

Dedup happens **before** Gemini is called. Once an item is formatted it's marked seen even if the send fails, to avoid re-processing it.

## Architecture

```
src/
├── main.ts              # orchestrator: quiet hours → specials → queue → refill → send
├── config.ts            # all env vars and constants in one place
├── specials.ts          # weekly digest / repo spotlight / poll scheduling + runners
├── sources/
│   ├── index.ts         # fans out to all sources in parallel, merges items + failed-source names
│   ├── rss.ts           # generic RSS parser (news sites + Telegram channels via RSSHub); null = fetch failure
│   ├── reddit.ts        # Reddit public JSON API (no auth)
│   ├── youtube.ts       # YouTube channels via official RSS (no API key)
│   ├── github-trending.ts  # cheerio scrape of github.com/trending
│   └── article.ts       # best-effort scrape of an article's body text for deeper Gemini analysis
├── ai/
│   ├── client.ts        # shared Gemini transport: 3-retry, timeout, text + JSON modes
│   ├── curate.ts        # one JSON pass: rank candidates, drop same-story dupes, assign category
│   └── gemini.ts        # Persian writers: news post, weekly digest, repo spotlight, poll
├── publisher/
│   └── telegram.ts      # sendPost (media→text fallback, inline link button), sendPoll, sendAdminMessage
├── storage/
│   ├── queue.ts         # load/save data/queue.json
│   ├── dedup.ts         # load/save data/posted.json, hashUrl()
│   ├── archive.ts       # load/append data/archive.json
│   └── state.ts         # load/save data/state.json (source health + specials dates)
└── util/
    ├── time.ts          # Tehran-timezone helpers, quiet-hours check
    ├── pick.ts          # round-robin pickDiverse (curation fallback)
    └── categories.ts    # category enum + Persian hashtag mapping
```

`docs/index.html` is a static, dependency-free archive page (reads `data/archive.json` from raw.githubusercontent.com) meant for GitHub Pages (Settings → Pages → main branch, `/docs` folder).

## Key design decisions

- **`config.ts` is the single source of truth** for all tunables (`maxPostsPerRun`, `geminiModel`, `rssFeeds` list, quiet hours, etc.). Adding a new RSS feed only requires editing the `rssFeeds` array there.
- **Source health**: each fetcher reports failed source labels; `data/state.json` tracks consecutive failures and the admin (`TELEGRAM_ADMIN_CHAT_ID`, optional) is pinged once when a source hits 3 in a row.
- **Telegram channels** are read via `https://rsshub.app/telegram/channel/{username}` (public RSSHub instance) — same `fetchFeed()` helper as regular RSS.
- **Gemini output rules** are enforced in the system prompt in `gemini.ts`: plain text only, no Markdown/HTML, no links, no hashtags, max 950 chars, no Arabic diacritics. The diacritics strip also runs as a post-process regex (`DIACRITICS`).
- **Link button**: the article link is an inline keyboard button, not a text line. Text-only posts still get a link preview via an invisible `<a>` anchor (word joiner) at the start of the message.
- **Media fallback**: if a post has a `mediaUrl` but the visible text length would exceed Telegram's 1024-char caption limit, or if the media upload fails, it falls back to `sendMessage` with link preview.
- **Weekly specials** replace (not add to) the regular post on their scheduled run; on transient failure the date isn't marked, so a later run the same day retries.
- **X/Twitter source was removed** — all public Nitter instances are down or bot-protected.
- **GitLab**: `.gitlab-ci.yml` mirrors the Actions workflow (see its header comment for the required CI variables and pipeline schedule).

## Environment variables

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | — |
| `TELEGRAM_BOT_TOKEN` | ✅ | — |
| `TELEGRAM_CHANNEL_ID` | ✅ | — |
| `TELEGRAM_ADMIN_CHAT_ID` | ❌ | (empty — health alerts off) |
| `TELEGRAM_CHANNELS` | ❌ | (empty) |
| `REDDIT_SUBREDDITS` | ❌ | technology,programming,artificial,gadgets |
| `YOUTUBE_CHANNELS` | ❌ | (empty) |
