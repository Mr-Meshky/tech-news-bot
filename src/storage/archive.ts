import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { config } from "../config";
import type { Category } from "../util/categories";

/** One successfully-posted item — feeds the weekly digest, polls, and the web archive page */
export interface ArchiveEntry {
  title: string;
  url: string;
  source: string;
  category?: Category;
  postedAt: string;
}

interface ArchiveStore {
  entries: ArchiveEntry[];
  lastUpdated: string;
}

export async function loadArchive(): Promise<ArchiveEntry[]> {
  try {
    const raw = await readFile(config.archivePath, "utf-8");
    return (JSON.parse(raw) as ArchiveStore).entries;
  } catch {
    return [];
  }
}

export async function appendArchive(entry: ArchiveEntry): Promise<void> {
  const entries = [...(await loadArchive()), entry].slice(
    -config.maxArchiveEntries
  );
  const store: ArchiveStore = { entries, lastUpdated: new Date().toISOString() };
  await mkdir(dirname(config.archivePath), { recursive: true });
  await writeFile(config.archivePath, JSON.stringify(store, null, 2), "utf-8");
}

/** Entries posted within the last `days` days, oldest first */
export function entriesSince(entries: ArchiveEntry[], days: number): ArchiveEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => Date.parse(e.postedAt) >= cutoff);
}
