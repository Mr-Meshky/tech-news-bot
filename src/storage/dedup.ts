import { readFile, writeFile, mkdir } from "fs/promises";
import { createHash } from "crypto";
import { dirname } from "path";
import { config } from "../config";

interface DedupStore {
  ids: string[];
  lastUpdated: string;
}

export function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export async function loadDedupStore(): Promise<Set<string>> {
  try {
    const raw = await readFile(config.dedupPath, "utf-8");
    const store = JSON.parse(raw) as DedupStore;
    return new Set(store.ids);
  } catch {
    return new Set();
  }
}

export async function saveDedupStore(seen: Set<string>): Promise<void> {
  const ids = [...seen].slice(-config.maxDedupEntries);
  const store: DedupStore = { ids, lastUpdated: new Date().toISOString() };
  await mkdir(dirname(config.dedupPath), { recursive: true });
  await writeFile(config.dedupPath, JSON.stringify(store, null, 2), "utf-8");
}
