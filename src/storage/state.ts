import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { config } from "../config";

/** Cross-run operational state, committed to git like the queue/dedup files */
export interface BotState {
  /** Consecutive failure count per source label — reset to 0 on success */
  sourceFailures: Record<string, number>;
  /** Tehran dateKey (YYYY-MM-DD) of the last weekly digest post */
  lastDigestOn?: string;
  /** Tehran dateKey of the last repo-spotlight post */
  lastSpotlightOn?: string;
  /** Tehran dateKey of the last poll */
  lastPollOn?: string;
}

export async function loadState(): Promise<BotState> {
  try {
    const raw = await readFile(config.statePath, "utf-8");
    const state = JSON.parse(raw) as Partial<BotState>;
    return { sourceFailures: {}, ...state };
  } catch {
    return { sourceFailures: {} };
  }
}

export async function saveState(state: BotState): Promise<void> {
  await mkdir(dirname(config.statePath), { recursive: true });
  await writeFile(config.statePath, JSON.stringify(state, null, 2), "utf-8");
}
