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

این ربات هر ۱۵ دقیقه یه پست تازه از اخبار تکنولوژی دنیا به **[@MrMeshkyChannel](https://t.me/MrMeshkyChannel)** می‌فرسته — نه فقط ترجمه، بلکه تحلیل و نظر.

> **جوین بشو 👉 [t.me/MrMeshkyChannel](https://t.me/MrMeshkyChannel)**

---

## ✨ چطور کار می‌کنه؟

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions Cron                │
│                    (هر ۱۵ دقیقه)                   │
└───────────────────────┬─────────────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │       منابع خبری           │
          │  RSS · Reddit · GitHub     │
          │  Trending · Telegram       │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │      Gemini 2.5 Flash      │
          │  ترجمه + تحلیل فارسی       │
          │  لحن کانال‌ محور، نه خبری  │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │       Telegram API         │
          │   ارسال پست با تصویر       │
          └─────────────┬──────────────┘
                        │
          ┌─────────────▼──────────────┐
          │     Git State Commit       │
          │  ذخیره وضعیت بدون دیتابیس │
          └────────────────────────────┘
```

---

## 🗞️ منابع خبری

| منبع | نوع | نیاز به API؟ |
|------|-----|--------------|
| TechCrunch, The Verge, Wired, Ars Technica, Hacker News, MIT Tech Review, Zoomit | RSS | ❌ رایگان |
| Reddit (technology, programming, artificial, gadgets) | RSS عمومی | ❌ رایگان |
| GitHub Trending | Scrape | ❌ رایگان |
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
| `TELEGRAM_CHANNELS` | کانال‌های تلگرامی برای خوندن (جدا با `,`) | ❌ |
| `REDDIT_SUBREDDITS` | ساب‌ردیت‌های دلخواه (جدا با `,`) | ❌ |

### ۳. ربات رو فعال کن

بعد از اضافه کردن Secretها، برو **Actions → Tech News Bot → Run workflow**. از این به بعد هر ۱۵ دقیقه خودکار اجرا می‌شه.

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
│   ├── main.ts              # نقطه ورود — منطق اصلی اجرا
│   ├── config.ts            # همه تنظیمات یه‌جا
│   ├── sources/
│   │   ├── rss.ts           # خوندن RSS (خبرسایت‌ها + کانال‌های تلگرام)
│   │   ├── reddit.ts        # ردیت (بدون API)
│   │   └── github-trending.ts # ترندینگ گیت‌هاب
│   ├── ai/
│   │   └── gemini.ts        # فرمت‌کردن با Gemini
│   ├── publisher/
│   │   └── telegram.ts      # ارسال به تلگرام
│   └── storage/
│       ├── dedup.ts         # جلوگیری از تکرار
│       └── queue.ts         # صف پست‌های آماده
├── data/
│   ├── posted.json          # هش URLهای ارسال‌شده (state)
│   └── queue.json           # پست‌های آماده در صف
└── .github/workflows/
    └── bot.yml              # GitHub Actions cron هر ۱۵ دقیقه
```

---

## 💡 چرا این معماری؟

- **بدون سرور**: GitHub Actions رایگانه و همیشه روشنه
- **بدون دیتابیس**: state توی git ذخیره می‌شه (فایل‌های `data/`)
- **بدون هزینه API**: همه منابع از endpointهای عمومی رایگانن
- **صف هوشمند**: بچ ۸تایی فرم می‌شه، هر ۱۵ دقیقه یه پست می‌ره — بدون spam

---

## 📄 مجوز

MIT — fork کن، تغییر بده، استفاده کن.

---

<div align="center">

ساخته‌شده با ❤️ توسط [@Mr-Meshky](https://github.com/Mr-Meshky)

**[👉 کانال تلگرام: @MrMeshkyChannel](https://t.me/MrMeshkyChannel)**

</div>
