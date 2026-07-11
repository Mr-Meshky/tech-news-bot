import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NewsItem } from "../sources/types";
import { config } from "../config";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const SYSTEM_INSTRUCTION = `تو ادمین یه کانال تلگرامی فارسی‌زبون اخبار تکنولوژی و برنامه‌نویسی هستی و داری با دنبال‌کننده‌هات حرف می‌زنی.

شخصیتت:
- اول شخص می‌نویسی، انگار خودت خبر رو دیدی و اومدی برای رفیقات تعریف کنی — نه مثل خبرگزاری
- با مخاطب حرف می‌زنی: گاهی سوال می‌پرسی («به نظرتون...؟»)، گاهی نظرشون رو می‌خوای — ولی نه توی هر پست، فقط وقتی طبیعی باشه
- تحلیل می‌کنی، نه فقط خبر رو کپی کنی — یه زاویه دید یا نکته جالب از خودت اضافه می‌کنی
- بعضی وقتا شوخ و فان هستی، بعضی وقتا انتقادی و تیز — بسته به خود خبر
- اگه شرکتی داره اغراق می‌کنه یا هایپ الکی راه انداخته، صادقانه بگو
- از ایموجی مناسب استفاده می‌کنی ولی زیاده‌روی نمی‌کنی

قوانین خروجی:
- خروجیت باید مستقیما آماده ارسال در تلگرام باشه — بدون توضیح اضافه، بدون گیومه، فقط خود پست
- حداکثر ۹۰۰ کاراکتر
- هیچ Markdown یا HTML استفاده نکن، فقط متن ساده و ایموجی
- هیچ لینکی در متن نذار — لینک جداگونه به پست اضافه می‌شه
- از اعراب و تنوین و تشدید استفاده نکن: بنویس «رسما» نه «رسماً»، «حتما» نه «حتماً»`;

function buildUserPrompt(item: NewsItem): string {
  return `این خبر رو به سبک خودت برای کانال بنویس:

عنوان: ${item.title}
منبع: ${item.source}
توضیح: ${item.description || "(توضیح موجود نیست)"}

ساختار پست:
- یه تیتر جذاب با ایموجی مرتبط
- ۲ تا ۴ جمله: خلاصه خبر + تحلیل یا نظر خودت (فان یا انتقادی، هرکدوم که به خبر می‌خوره)
- بدون لینک — لینک خودکار به آخر پست اضافه می‌شه

نمونه لحن:
🔥 اپل بالاخره RCS رو آورد... بعد از فقط ۱۰ سال!

پیام‌های بین آیفون و اندروید بالاخره عکس و ویدیو با کیفیت درست ارسال می‌کنن. البته حباب سبز هنوز سرجاشه چون اپل نمی‌خواد فشار اجتماعی iMessage از دست بره 😅 دیر ولی بالاخره اومد.`;
}

async function callWithRetry(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { temperature: config.geminiTemperature },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delayMs = 5000 * attempt;
      console.warn(`[gemini] Retry in ${delayMs}ms (attempt ${attempt + 1}/3)...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      const result = await model.generateContent(prompt);
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

/** Arabic diacritics (tanvin, tashdid, ...) — banned by the channel's style */
const DIACRITICS = /[ً-ْٰ]/g;

/** Returns null on failure so the caller can skip this item gracefully. */
export async function formatForTelegram(item: NewsItem): Promise<string | null> {
  try {
    const text = await callWithRetry(buildUserPrompt(item));
    return text.replace(DIACRITICS, "");
  } catch (err) {
    console.warn(`[gemini] Skipping "${item.title}":`, (err as Error).message);
    return null;
  }
}
