import "dotenv/config";
import { fetchAllSources } from "./sources/index";
import { fetchArticleText } from "./sources/article";
import { loadDedupStore, saveDedupStore, hashUrl } from "./storage/dedup";
import { loadQueue, saveQueue } from "./storage/queue";
import { loadState, saveState, type BotState } from "./storage/state";
import { appendArchive } from "./storage/archive";
import { formatForTelegram } from "./ai/gemini";
import { curateItems, type CuratedItem } from "./ai/curate";
import {
  sendPost,
  sendAdminMessage,
  type OutgoingPost,
} from "./publisher/telegram";
import { pickDiverse } from "./util/pick";
import { tehranNow, isQuietHour } from "./util/time";
import { hashtagsFor } from "./util/categories";
import { dueSpecial, runSpecial } from "./specials";
import { config } from "./config";

/** Bump failure counters, alert the admin once a source crosses the threshold */
async function updateSourceHealth(
  state: BotState,
  failedSources: string[]
): Promise<void> {
  const failed = new Set(failedSources);
  for (const name of Object.keys(state.sourceFailures)) {
    if (!failed.has(name)) delete state.sourceFailures[name]; // recovered
  }
  for (const name of failedSources) {
    const count = (state.sourceFailures[name] ?? 0) + 1;
    state.sourceFailures[name] = count;
    if (count === config.sourceFailureAlertThreshold) {
      await sendAdminMessage(
        `⚠️ منبع «${name}» در ${count} اجرای پشت‌سرهم ناموفق بوده.`
      );
    }
  }
}

/**
 * Each run sends exactly one post. When the queue is empty, fresh news is
 * fetched, curated by Gemini (importance + cross-source dedup + category),
 * enriched with the article body, and formatted — so a new batch posts one
 * item immediately and the rest go out one-per-run on the workflow's schedule.
 */
async function refillQueue(
  seen: Set<string>,
  state: BotState
): Promise<OutgoingPost[]> {
  const { items: rawItems, failedSources } = await fetchAllSources();
  await updateSourceHealth(state, failedSources);

  const newItems = rawItems.filter((item) => !seen.has(hashUrl(item.url)));
  console.log(`[main] New items after dedup: ${newItems.length}`);
  if (newItems.length === 0) return [];

  let curated: CuratedItem[] | null = await curateItems(
    newItems,
    config.maxPostsPerRun
  );
  if (curated === null) {
    curated = pickDiverse(newItems, config.maxPostsPerRun).map((item) => ({
      item,
      category: "other" as const,
    }));
  }

  const queue: OutgoingPost[] = [];
  for (const { item, category } of curated) {
    console.log(`[main] Formatting: "${item.title}" (${item.source})`);
    // Scraped article body gives Gemini real substance to analyse
    const articleText = await fetchArticleText(item.url);
    const body = await formatForTelegram(item, articleText);
    if (body !== null) {
      queue.push({
        body,
        linkUrl: item.url,
        title: item.title,
        source: item.source,
        category,
        hashtags: hashtagsFor(category),
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType,
      });
      // Mark as seen once formatted (regardless of send outcome) to
      // prevent reprocessing the same item in future refills.
      seen.add(hashUrl(item.url));
    }
  }

  console.log(`[main] ${queue.length}/${curated.length} formatted`);
  if (queue.length === 0 && curated.length > 0) {
    await sendAdminMessage(
      `⚠️ Gemini هیچ‌کدوم از ${curated.length} آیتم رو فرمت نکرد — کلید API یا سهمیه رو چک کن.`
    );
  }
  await saveDedupStore(seen);
  return queue;
}

async function main(): Promise<void> {
  console.log(`[main] Tech News Bot starting — ${new Date().toISOString()}`);

  const tehran = tehranNow();
  if (isQuietHour(tehran.hour, config.quietHoursStart, config.quietHoursEnd)) {
    console.log(
      `[main] Quiet hours in Tehran (${tehran.hour}:xx) — skipping this run.`
    );
    return;
  }

  const state = await loadState();
  const seen = await loadDedupStore();
  console.log(`[main] Dedup store: ${seen.size} known IDs`);

  // Weekly specials (digest / repo spotlight / poll) replace the regular
  // post on their scheduled run.
  const special = dueSpecial(state, tehran);
  if (special) {
    console.log(`[main] Special post due: ${special}`);
    const posted = await runSpecial(special, state, tehran, seen);
    await saveState(state);
    if (posted) {
      await saveDedupStore(seen);
      console.log("[main] Done (special).");
      return;
    }
  }

  let queue = await loadQueue();
  console.log(`[main] Queue: ${queue.length} pending posts`);

  if (queue.length === 0) {
    queue = await refillQueue(seen, state);
  }

  const post = queue.shift();
  if (!post) {
    console.log("[main] Nothing to post. Exiting.");
    await saveQueue(queue);
    await saveState(state);
    return;
  }

  try {
    await sendPost(post);
    console.log(`[main] Posted 1 item; ${queue.length} left in queue`);
    if (post.title && post.linkUrl) {
      await appendArchive({
        title: post.title,
        url: post.linkUrl,
        source: post.source ?? "unknown",
        category: post.category,
        postedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    const attempts = (post.attempts ?? 0) + 1;
    if (attempts < config.maxSendAttempts) {
      // Put it at the back of the queue for a later run instead of losing it
      queue.push({ ...post, attempts });
      console.warn(
        `[main] Send failed (attempt ${attempts}/${config.maxSendAttempts}), re-queued:`,
        (err as Error).message
      );
    } else {
      console.error(
        `[main] Send failed ${attempts} times, dropping post:`,
        (err as Error).message
      );
      await sendAdminMessage(
        `❌ یه پست بعد از ${attempts} تلاش ارسال نشد و حذف شد:\n${post.title ?? post.body.slice(0, 80)}`
      );
    }
  }

  await saveQueue(queue);
  await saveState(state);
  console.log(`[main] Done.`);
}

// Safety net: force-kill in case any socket never closes. 8 minutes leaves
// room for the curation pass + per-item article scraping on refill runs.
const killTimer = setTimeout(() => {
  console.error("[main] Global timeout — force exiting");
  process.exit(1);
}, 8 * 60_000);

main()
  .catch((err) => {
    console.error("[main] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => {
    clearTimeout(killTimer);
    // rss-parser leaves sockets open after timeout — force-exit to close them
    process.exit(0);
  });
