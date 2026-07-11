import "dotenv/config";
import { fetchAllSources } from "./sources/index";
import { loadDedupStore, saveDedupStore, hashUrl } from "./storage/dedup";
import { loadQueue, saveQueue } from "./storage/queue";
import { formatForTelegram } from "./ai/gemini";
import { sendPost, type OutgoingPost } from "./publisher/telegram";
import { config } from "./config";

/**
 * Each run sends exactly one post. When the queue is empty, fresh news is
 * fetched and formatted first — so a new batch posts one item immediately
 * and the rest go out one-per-run on the workflow's schedule.
 */
async function refillQueue(seen: Set<string>): Promise<OutgoingPost[]> {
  const rawItems = await fetchAllSources();

  const newItems = rawItems.filter((item) => !seen.has(hashUrl(item.url)));
  console.log(`[main] New items after dedup: ${newItems.length}`);

  const itemsToProcess = newItems.slice(0, config.maxPostsPerRun);
  const queue: OutgoingPost[] = [];

  for (const item of itemsToProcess) {
    console.log(`[main] Formatting: "${item.title}" (${item.source})`);
    const body = await formatForTelegram(item);
    if (body !== null) {
      queue.push({
        body,
        linkUrl: item.url,
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType,
      });
      // Mark as seen once formatted (regardless of send outcome) to
      // prevent reprocessing the same item in future refills.
      seen.add(hashUrl(item.url));
    }
  }

  console.log(`[main] ${queue.length}/${itemsToProcess.length} formatted`);
  await saveDedupStore(seen);
  return queue;
}

async function main(): Promise<void> {
  console.log(`[main] Tech News Bot starting — ${new Date().toISOString()}`);

  const seen = await loadDedupStore();
  console.log(`[main] Dedup store: ${seen.size} known IDs`);

  let queue = await loadQueue();
  console.log(`[main] Queue: ${queue.length} pending posts`);

  if (queue.length === 0) {
    queue = await refillQueue(seen);
  }

  const post = queue.shift();
  if (!post) {
    console.log("[main] Nothing to post. Exiting.");
    await saveQueue(queue);
    return;
  }

  try {
    await sendPost(post);
    console.log(`[main] Posted 1 item; ${queue.length} left in queue`);
  } catch (err) {
    console.error(`[main] Send failed, dropping post:`, (err as Error).message);
  }

  await saveQueue(queue);
  console.log(`[main] Done.`);
}

main().catch((err) => {
  console.error("[main] Fatal error:", err);
  process.exit(1);
});
