// Imported first in every test file — config.ts requires these at import time.
process.env["TELEGRAM_BOT_TOKEN"] ??= "test-token";
process.env["TELEGRAM_CHANNEL_ID"] ??= "@testchannel";
process.env["GEMINI_API_KEY"] ??= "test-key";
