<div align="center">

# 🤖 Tech News Bot

**ربات هوشمند اخبار تکنولوژی — فارسی، با تحلیل، بدون هایپ**

[![Telegram Channel](https://img.shields.io/badge/Telegram-MrMeshkyChannel-blue?logo=telegram&style=for-the-badge)](https://t.me/MrMeshkyChannel)
[![GitHub Actions](https://img.shields.io/badge/Powered_by-GitHub_Actions-2088FF?logo=github-actions&style=for-the-badge)](https://github.com/features/actions)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?logo=google&style=for-the-badge)](https://aistudio.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&style=for-the-badge)](https://www.typescriptlang.org/)

</div>

---

## 📡 کانال تلگرام

این ربات هر ۳ ساعت یه پست تازه از اخبار تکنولوژی دنیا به **[@MrMeshkyChannel](https://t.me/MrMeshkyChannel)** می‌فرسته — نه فقط ترجمه، بلکه تحلیل و نظر.

> **جوین بشو 👉 [t.me/MrMeshkyChannel](https://t.me/MrMeshkyChannel)**

---

## ✨ چطور کار می‌کنه؟

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions Cron                │
│              (هر ۳ ساعت — با ساعت خواب)             │
└───────────────────────┬─────────────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │       منابع خبری           │
          │  RSS · Reddit · GitHub     │
          │  Trending · Telegram · YT  │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │   سردبیر AI (Curation)     │
          │  رتبه‌بندی اهمیت + حذف     │
          │  خبرهای تکراری هم‌موضوع    │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │      Gemini 2.5 Flash      │
          │  ترجمه + تحلیل فارسی       │
          │  با متن کامل مقاله         │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │       Telegram API         │
          │  پست با تصویر + دکمه لینک  │
          │  + هشتگ دسته‌بندی           │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │     Git State Commit       │
          │  ذخیره وضعیت بدون دیتابیس │
          └────────────────────────────┘
```

---

## ✨ امکانات

- 🧠 **سردبیر هوشمند** — قبل از فرمت‌شدن، Gemini خبرها رو بر اساس اهمیت رتبه‌بندی می‌کنه و خبرهای هم‌موضوع از منابع مختلف رو یکی می‌کنه
- 📖 **تحلیل عمیق** — متن کامل مقاله scrape می‌شه و به AI داده می‌شه، نه فقط تیتر
- 🏷 **هشتگ خودکار** — هر پست دسته‌بندی و هشتگ فارسی می‌گیره (#هوش_مصنوعی، #امنیت، ...)
- 🌙 **ساعت خواب** — بین ۱ تا ۸ صبح تهران پستی ارسال نمی‌شه
- 📅 **پست‌های ویژه هفتگی** — جمعه: جمع‌بندی هفته · دوشنبه: معرفی ریپوی ترند گیت‌هاب · چهارشنبه: نظرسنجی
- 🔁 **صف مقاوم** — پست ناموفق دور انداخته نمی‌شه، تا ۳ بار دوباره تلاش می‌شه
- 🚨 **هشدار سلامت** — اگه منبعی ۳ اجرای پشت‌سرهم fail کنه، به PV ادمین پیام می‌ره
- 🗂 **آرشیو وب** — صفحه استاتیک [docs/index.html](docs/index.html) برای GitHub Pages با جستجو و فیلتر دسته
- 🦊 **پشتیبانی GitLab** — با `.gitlab-ci.yml` آماده، روی گیت‌لب هم بالا میاد

---

## 🗞️ منابع خبری

| منبع | نوع | نیاز به API؟ |
|------|-----|--------------|
| TechCrunch, The Verge, Wired, Ars Technica, Hacker News (۱۵۰+ امتیاز), MIT Tech Review, Zoomit | RSS | ❌ رایگان |
| Product Hunt, Dev.to, Lobsters | RSS | ❌ رایگان |
| بلاگ‌های رسمی: GitHub Blog, OpenAI, Google AI | RSS | ❌ رایگان |
| Reddit (technology, programming, artificial, gadgets) | JSON عمومی | ❌ رایگان |
| GitHub Trending | Scrape | ❌ رایگان |
| کانال‌های یوتیوب (اختیاری) | RSS رسمی یوتیوب | ❌ رایگان |
| کانال‌های تلگرام دیگه | RSSHub proxy | ❌ رایگان |

---

## 🤖 پرامپت هوش مصنوعی

ربات با Gemini 2.5 Flash تنظیم شده که مثل ادمین یه کانال غیررسمی بنویسه، نه مثل خبرگزاری:
- اول شخص، انگار خودش خبر رو دیده
- تحلیل و نظر اضافه می‌کنه
- اگه شرکتی داره هایپ می‌کنه، صادقانه می‌گه
- گاهی شوخ، گاهی انتقادی — بسته به خود خبر

---

## 🚀 راه‌اندازی (Fork کن و بزن)

### ۱. ریپو رو Fork کن

```bash
# کلون کن
git clone https://github.com/Mr-Meshky/tech-news-bot.git
cd tech-news-bot

# وابستگی‌ها
pnpm install
```

### ۲. Secret های GitHub رو تنظیم کن

توی ریپو خودت برو **Settings → Secrets and variables → Actions** و این‌ها رو اضافه کن:

| Secret | توضیح | اجباری؟ |
|--------|-------|---------|
| `GEMINI_API_KEY` | از [aistudio.google.com](https://aistudio.google.com/app/apikey) | ✅ |
| `TELEGRAM_BOT_TOKEN` | از [@BotFather](https://t.me/BotFather) روی تلگرام | ✅ |
| `TELEGRAM_CHANNEL_ID` | مثلا `@mychannel` یا `-1001234567890` | ✅ |
| `TELEGRAM_ADMIN_CHAT_ID` | chat_id خودت برای هشدارهای سلامت (از [@userinfobot](https://t.me/userinfobot)) | ❌ |
| `TELEGRAM_CHANNELS` | کانال‌های تلگرامی برای خوندن (جدا با `,`) | ❌ |
| `REDDIT_SUBREDDITS` | ساب‌ردیت‌های دلخواه (جدا با `,`) | ❌ |
| `YOUTUBE_CHANNELS` | آی‌دی کانال‌های یوتیوب — فرم `UC...` (جدا با `,`) | ❌ |

### ۳. ربات رو فعال کن

بعد از اضافه کردن Secretها، برو **Actions → Tech News Bot → Run workflow**. از این به بعد هر ۳ ساعت خودکار اجرا می‌شه.

### ۴. تست لوکال

```bash
cp .env.example .env
# مقادیر رو توی .env پر کن

pnpm dev
```

---

## ⚙️ تنظیمات

همه تنظیمات اصلی توی [src/config.ts](src/config.ts) هستن:

```ts
maxPostsPerRun: 8,        // تعداد پست در هر بچ
geminiModel: "gemini-2.5-flash",
geminiTemperature: 0.9,   // خلاقیت پاسخ AI (0-1)
maxDedupEntries: 500,     // تعداد URLهای حفظ‌شده برای جلوگیری از تکرار
```

برای اضافه کردن فید RSS جدید، آرایه `rssFeeds` رو در همون فایل ویرایش کن.

---

## 🏗️ ساختار پروژه

```
tech-news-bot/
├── src/
│   ├── main.ts              # نقطه ورود — ساعت خواب → پست ویژه → صف → ارسال
│   ├── config.ts            # همه تنظیمات یه‌جا
│   ├── specials.ts          # پست‌های ویژه هفتگی (جمع‌بندی، ریپوی هفته، نظرسنجی)
│   ├── sources/
│   │   ├── rss.ts           # خوندن RSS (خبرسایت‌ها + کانال‌های تلگرام)
│   │   ├── reddit.ts        # ردیت (بدون API)
│   │   ├── youtube.ts       # کانال‌های یوتیوب (RSS رسمی، بدون API)
│   │   ├── github-trending.ts # ترندینگ گیت‌هاب
│   │   └── article.ts       # scrape متن کامل مقاله برای تحلیل عمیق‌تر
│   ├── ai/
│   │   ├── client.ts        # ارتباط با Gemini (retry، حالت متن و JSON)
│   │   ├── curate.ts        # سردبیر: رتبه‌بندی + حذف تکراری‌ها + دسته‌بندی
│   │   └── gemini.ts        # نویسنده فارسی: خبر، جمع‌بندی، ریپو، نظرسنجی
│   ├── publisher/
│   │   └── telegram.ts      # ارسال به تلگرام (پست، نظرسنجی، هشدار ادمین)
│   ├── storage/
│   │   ├── dedup.ts         # جلوگیری از تکرار
│   │   ├── queue.ts         # صف پست‌های آماده
│   │   ├── archive.ts       # آرشیو پست‌های ارسال‌شده
│   │   └── state.ts         # سلامت منابع + تاریخ پست‌های ویژه
│   └── util/                # زمان تهران، دسته‌بندی/هشتگ، انتخاب متنوع
├── tests/                   # تست‌های node:test برای توابع pure
├── docs/
│   └── index.html           # آرشیو وب (GitHub Pages)
├── data/
│   ├── posted.json          # هش URLهای ارسال‌شده (state)
│   ├── queue.json           # پست‌های آماده در صف
│   ├── archive.json         # آرشیو عنوان/لینک پست‌های موفق
│   └── state.json           # شمارنده خطای منابع + زمان‌بندی ویژه‌ها
├── .gitlab-ci.yml           # معادل ورک‌فلو برای GitLab
└── .github/workflows/
    └── bot.yml              # GitHub Actions cron هر ۳ ساعت
```

---

## 💡 چرا این معماری؟

- **بدون سرور**: GitHub Actions رایگانه و همیشه روشنه
- **بدون دیتابیس**: state توی git ذخیره می‌شه (فایل‌های `data/`)
- **بدون هزینه API**: همه منابع از endpointهای عمومی رایگانن
- **صف هوشمند**: بچ ۸تایی فرم می‌شه، هر ۳ ساعت یه پست می‌ره — بدون spam

### 🦊 اجرا روی GitLab

منطق ربات به هیچ پلتفرمی وابسته نیست — فایل [.gitlab-ci.yml](.gitlab-ci.yml) معادل کامل ورک‌فلو رو داره. کافیه:
1. متغیرهای CI/CD رو تعریف کنی (همون Secretها + یه `GITLAB_PUSH_TOKEN` با اسکوپ `write_repository` برای کامیت `data/`)
2. یه Pipeline Schedule با cron `0 */3 * * *` بسازی

جزئیات کامل توی کامنت بالای همون فایله. ⚠️ سهمیه رایگان gitlab.com ماهی ۴۰۰ دقیقه‌ست — با هر ۳ ساعت ممکنه وسط ماه تموم شه؛ هر ۴-۶ ساعت یا runner شخصی امن‌تره.

---

## 📄 مجوز

MIT — fork کن، تغییر بده، استفاده کن.

---

<div align="center">

ساخته‌شده با ❤️ توسط [@Mr-Meshky](https://github.com/Mr-Meshky)

**[👉 کانال تلگرام: @MrMeshkyChannel](https://t.me/MrMeshkyChannel)**

</div>
