import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

interface GenerateOptions {
  systemInstruction: string;
  /** Ask Gemini for a JSON document instead of free text */
  json?: boolean;
  temperature?: number;
}

async function callWithRetry(
  prompt: string,
  opts: GenerateOptions
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: opts.systemInstruction,
    generationConfig: {
      temperature: opts.temperature ?? config.geminiTemperature,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delayMs = 5000 * attempt;
      console.warn(`[gemini] Retry in ${delayMs}ms (attempt ${attempt + 1}/3)...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timed out")), 30_000)
      );
      const result = await Promise.race([model.generateContent(prompt), timeout]);
      const text = result.response.text().trim();
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err) {
      lastError = err;
      const msg = (err as Error).message ?? "";
      const isTransient =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("RATE_LIMIT") ||
        msg.includes("quota");
      if (!isTransient) break;
    }
  }
  throw lastError;
}

export function generateText(
  prompt: string,
  opts: Omit<GenerateOptions, "json">
): Promise<string> {
  return callWithRetry(prompt, opts);
}

/** Generates and parses a JSON response. Throws on invalid JSON. */
export async function generateJson<T>(
  prompt: string,
  opts: Omit<GenerateOptions, "json">
): Promise<T> {
  const raw = await callWithRetry(prompt, { ...opts, json: true });
  // Defensive: some models wrap JSON in ``` fences despite the mime type
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned) as T;
}
