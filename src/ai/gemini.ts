import type { NewsItem } from "../sources/types";
import type { ArchiveEntry } from "../storage/archive";
import { generateText, generateJson } from "./client";

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
- هیچ هشتگی در متن نذار — هشتگ جداگانه اضافه می‌شه
- هیچ @username یا امضا یا نام کانال در انتها نذار — امضا جداگانه اضافه می‌شه
- از اعراب و تنوین و تشدید استفاده نکن: بنویس «رسما» نه «رسماً»، «حتما» نه «حتماً»`;

function buildUserPrompt(item: NewsItem, articleText: string): string {
  const articleBlock = articleText
    ? `\nمتن مقاله (برای تحلیل عمیق‌تر، خودت خلاصه کن):\n${articleText}\n`
    : "";
  return `این خبر رو به سبک کانال بنویس:

عنوان: ${item.title}
منبع: ${item.source}
توضیح: ${item.description || "(توضیح موجود نیست)"}
${articleBlock}
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

/** Arabic diacritics (tanvin, tashdid, ...) — banned by the channel's style */
const DIACRITICS = /[ً-ْٰ]/g;

function polish(text: string): string {
  return text.replace(DIACRITICS, "").trim();
}

/**
 * Formats one news item as a Persian channel post. `articleText` is the
 * optional scraped article body for deeper analysis.
 * Returns null on failure so the caller can skip this item gracefully.
 */
export async function formatForTelegram(
  item: NewsItem,
  articleText = ""
): Promise<string | null> {
  try {
    const text = await generateText(buildUserPrompt(item, articleText), {
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    return polish(text);
  } catch (err) {
    console.warn(`[gemini] Skipping "${item.title}":`, (err as Error).message);
    return null;
  }
}

/** Friday wrap-up built from the week's posted archive. */
export async function writeWeeklyDigest(
  entries: ArchiveEntry[]
): Promise<string | null> {
  const list = entries
    .map((e) => `- [${e.source}] ${e.title}`)
    .join("\n");
  const prompt = `این‌ها خبرهایی هستن که این هفته توی کانال پست شدن.
یه پست «جمع‌بندی هفته» بنویس:

${list}

ساختار:
- یه شروع محاوره‌ای کوتاه (مثلا: «هفته پرخبری بود...»)
- ۵ تا ۷ تا از مهم‌ترین‌ها رو انتخاب کن، هر کدوم یه خط با • و یه ایموجی مرتبط، خیلی خلاصه به فارسی
- یه جمله جمع‌بندی آخر
- حداکثر ۹۰۰ کاراکتر`;
  try {
    const text = await generateText(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    return polish(text);
  } catch (err) {
    console.warn(`[gemini] Weekly digest failed:`, (err as Error).message);
    return null;
  }
}

/** Monday deep-dive on one trending GitHub repo. */
export async function writeRepoSpotlight(
  item: NewsItem,
  readmeText: string
): Promise<string | null> {
  const readmeBlock = readmeText
    ? `\nمتن README (خودت خلاصه و تحلیل کن):\n${readmeText}\n`
    : "";
  const prompt = `پست «ریپوی هفته» بنویس — معرفی عمیق‌تر یه پروژه اوپن‌سورس:

ریپو: ${item.title.replace(/^GitHub Trending:\s*/, "")}
توضیح: ${item.description || "(توضیح موجود نیست)"}
${readmeBlock}
ساختار:
- شروع محاوره‌ای: این ریپو چیه و چرا ترند شده
- ۲ تا ۴ نکته با • درباره اینکه چیکار می‌کنه و به چه دردی می‌خوره
- یه جمع‌بندی صادقانه: کی باید بره سراغش، کی نه
- حداکثر ۹۰۰ کاراکتر`;
  try {
    const text = await generateText(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    return polish(text);
  } catch (err) {
    console.warn(`[gemini] Repo spotlight failed:`, (err as Error).message);
    return null;
  }
}

export interface GeneratedPoll {
  question: string;
  options: string[];
}

interface PollResponse {
  question?: string;
  options?: string[];
}

/** Engagement poll seeded by the week's hottest posted stories. */
export async function makePoll(
  recentTitles: string[]
): Promise<GeneratedPoll | null> {
  const prompt = `بر اساس این خبرهای اخیر کانال، یه نظرسنجی تلگرامی جذاب به فارسی بساز:

${recentTitles.map((t) => `- ${t}`).join("\n")}

قوانین:
- سوال نظری/سلیقه‌ای باشه که مخاطب برنامه‌نویس دوست داره جواب بده (نه سوال دانشی)
- سوال حداکثر ۲۵۰ کاراکتر، محاوره‌ای، می‌تونه ایموجی داشته باشه
- ۲ تا ۴ گزینه، هر کدوم حداکثر ۹۰ کاراکتر
- بدون اعراب و تنوین

فقط JSON با این شکل برگردون:
{"question": "...", "options": ["...", "..."]}`;
  try {
    const res = await generateJson<PollResponse>(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    const options = (res.options ?? [])
      .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
      .map((o) => polish(o).slice(0, 100));
    if (!res.question || options.length < 2) {
      throw new Error("Poll response missing question/options");
    }
    return { question: polish(res.question).slice(0, 300), options: options.slice(0, 4) };
  } catch (err) {
    console.warn(`[gemini] Poll generation failed:`, (err as Error).message);
    return null;
  }
}
