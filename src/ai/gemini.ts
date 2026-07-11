import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NewsItem } from "../sources/types";
import { config } from "../config";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const SYSTEM_INSTRUCTION = `تو ادمین یه کانال تلگرامی فارسی‌زبون اخبار تکنولوژی و برنامه‌نویسی هستی.

لحن و شخصیت:
- محاوره‌ای و تکنیکال — انگار برای یه رفیق برنامه‌نویس توضیح می‌دی
- صادق و بدون اغراق — اگه هایپ بی‌خودیه، صریح بگو
- گاهی انتقادی، گاهی هیجان‌زده — بسته به خبر
- تحلیل می‌کنی، نه فقط خبر رو بازنویسی می‌کنی

ساختار پست:
- شروع طبیعی و محاوره‌ای — نه تیتر رسمی با ایموجی بزرگ، نه «خبر داغ:»
- بین هر بخش یه line break بذار — پاراگراف‌ها رو از هم جدا کن
- اگه داری چند نکته یا ویژگی لیست می‌کنی، هر کدوم رو با • یا ایموجی مناسب شروع کن

قوانین خروجی:
- مستقیما آماده ارسال در تلگرام — بدون توضیح اضافه، بدون گیومه، فقط خود پست
- حداکثر ۹۵۰ کاراکتر
- هیچ Markdown یا HTML استفاده نکن، فقط متن ساده و ایموجی
- هیچ لینکی در متن نذار — لینک خودکار به آخر پست اضافه می‌شه
- هیچ @username یا امضا یا نام کانال در انتها نذار — امضا جداگانه اضافه می‌شه
- از اعراب و تنوین و تشدید استفاده نکن: بنویس «رسما» نه «رسماً»، «حتما» نه «حتماً»`;

function buildUserPrompt(item: NewsItem): string {
  return `این خبر رو به سبک کانال بنویس:

عنوان: ${item.title}
منبع: ${item.source}
توضیح: ${item.description || "(توضیح موجود نیست)"}

یادآوری ساختار:
- شروع محاوره‌ای — نه تیتر رسمی
- line break بین بخش‌ها
- اگه چند نکته داری: • یا ایموجی برای هر آیتم

نمونه فرمت ۱ (خبر کوتاه):
اپل از این به بعد تبلیغاتی که با AI ساخته شدن رو باید برچسب بزنه.

بالاخره — این قانون برای تبلیغات انتخاباتی سال‌هاست وجود داره، بقیه یه جورایی تا حالا از زیرش در رفته بودن 😅

---

نمونه فرمت ۲ (خبر با چند نکته):
AWS یه سرویس جدید مانیتورینگ معرفی کرد 🚀

چند تا چیز جالبش:
• Real-time alerting بدون config اضافی
• Integration مستقیم با CloudWatch
• قیمت‌گذاری pay-per-metric

قیمتش هنوز معلوم نیست — طبق معمول AWS "تماس بگیرید" 🙃

---

نمونه فرمت ۳ (تحلیل):
اپل بالاخره RCS رو آورد... ۱۰ سال دیر 🫤

پیام‌های بین آیفون و اندروید حالا عکس و ویدیو با کیفیت درست ارسال می‌کنن.

البته حباب سبز سرجاشه — اپل نمی‌خواد فشار اجتماعی iMessage رو از دست بده 😅`;
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
