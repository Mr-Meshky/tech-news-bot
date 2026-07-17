import type { BotState } from "./storage/state";
import type { TehranTime } from "./util/time";
import { loadArchive, appendArchive, entriesSince } from "./storage/archive";
import { hashUrl } from "./storage/dedup";
import { scrapeTrendingRepos } from "./sources/github-trending";
import { fetchArticleText } from "./sources/article";
import { writeWeeklyDigest, writeRepoSpotlight, makePoll } from "./ai/gemini";
import { sendPost, sendPoll } from "./publisher/telegram";

export type SpecialKind = "digest" | "spotlight" | "poll";

/**
 * Weekly schedule (Tehran time):
 * - Friday  ≥ 12:00 → week wrap-up digest
 * - Monday  ≥ 12:00 → GitHub repo spotlight
 * - Wednesday ≥ 18:00 → engagement poll
 * The dateKey guard means only the first qualifying run each day posts.
 */
export function dueSpecial(state: BotState, t: TehranTime): SpecialKind | null {
  if (t.weekday === "Fri" && t.hour >= 12 && state.lastDigestOn !== t.dateKey)
    return "digest";
  if (t.weekday === "Mon" && t.hour >= 12 && state.lastSpotlightOn !== t.dateKey)
    return "spotlight";
  if (t.weekday === "Wed" && t.hour >= 18 && state.lastPollOn !== t.dateKey)
    return "poll";
  return null;
}

async function runDigest(state: BotState, t: TehranTime): Promise<boolean> {
  const recent = entriesSince(await loadArchive(), 7);
  if (recent.length < 5) {
    console.log(`[specials] Only ${recent.length} archived posts this week — skipping digest`);
    state.lastDigestOn = t.dateKey; // don't retry all day for a thin week
    return false;
  }
  const body = await writeWeeklyDigest(recent);
  if (!body) return false;
  await sendPost({ body, hashtags: "#جمع_بندی_هفتگی #تکنولوژی" });
  state.lastDigestOn = t.dateKey;
  console.log(`[specials] Posted weekly digest (${recent.length} source posts)`);
  return true;
}

async function runSpotlight(
  state: BotState,
  t: TehranTime,
  seen: Set<string>
): Promise<boolean> {
  const repos = await scrapeTrendingRepos();
  const repo = repos.find((r) => !seen.has(hashUrl(r.url)));
  if (!repo) {
    console.log("[specials] No unseen trending repo — skipping spotlight");
    state.lastSpotlightOn = t.dateKey;
    return false;
  }
  // GitHub renders the README inside <article> — fetchArticleText picks it up
  const readme = await fetchArticleText(repo.url);
  const body = await writeRepoSpotlight(repo, readme);
  if (!body) return false;
  await sendPost({
    body,
    linkUrl: repo.url,
    title: repo.title,
    source: repo.source,
    hashtags: "#ریپوی_هفته #اوپن_سورس",
    mediaUrl: repo.mediaUrl,
    mediaType: repo.mediaType,
  });
  seen.add(hashUrl(repo.url));
  await appendArchive({
    title: repo.title,
    url: repo.url,
    source: repo.source,
    category: "programming",
    postedAt: new Date().toISOString(),
  });
  state.lastSpotlightOn = t.dateKey;
  console.log(`[specials] Posted repo spotlight: ${repo.title}`);
  return true;
}

async function runPoll(state: BotState, t: TehranTime): Promise<boolean> {
  const recent = entriesSince(await loadArchive(), 7);
  if (recent.length < 3) {
    console.log("[specials] Not enough recent posts to seed a poll — skipping");
    state.lastPollOn = t.dateKey;
    return false;
  }
  const titles = recent.slice(-5).map((e) => e.title);
  const poll = await makePoll(titles);
  if (!poll) return false;
  await sendPoll(poll.question, poll.options);
  state.lastPollOn = t.dateKey;
  console.log(`[specials] Posted poll: ${poll.question}`);
  return true;
}

/**
 * Runs one special post. Returns true when something was actually posted —
 * the caller then skips the regular news post for this run. On transient
 * failure the state date is NOT marked, so a later run the same day retries.
 */
export async function runSpecial(
  kind: SpecialKind,
  state: BotState,
  t: TehranTime,
  seen: Set<string>
): Promise<boolean> {
  try {
    if (kind === "digest") return await runDigest(state, t);
    if (kind === "spotlight") return await runSpotlight(state, t, seen);
    return await runPoll(state, t);
  } catch (err) {
    console.warn(`[specials] "${kind}" failed:`, (err as Error).message);
    return false;
  }
}
