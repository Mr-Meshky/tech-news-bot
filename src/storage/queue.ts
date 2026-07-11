import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { OutgoingPost } from "../publisher/telegram";

const QUEUE_PATH = "data/queue.json";

interface QueueStore {
  posts: OutgoingPost[];
  lastUpdated: string;
}

export async function loadQueue(): Promise<OutgoingPost[]> {
  try {
    const raw = await readFile(QUEUE_PATH, "utf-8");
    const store = JSON.parse(raw) as QueueStore;
    return store.posts;
  } catch {
    return [];
  }
}

export async function saveQueue(posts: OutgoingPost[]): Promise<void> {
  const store: QueueStore = { posts, lastUpdated: new Date().toISOString() };
  await mkdir(dirname(QUEUE_PATH), { recursive: true });
  await writeFile(QUEUE_PATH, JSON.stringify(store, null, 2), "utf-8");
}
