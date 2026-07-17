/** Post categories assigned by the Gemini curation pass */
export const CATEGORIES = [
  "ai",
  "programming",
  "mobile",
  "security",
  "gadgets",
  "web",
  "startup",
  "science",
  "game",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_HASHTAGS: Record<Category, string> = {
  ai: "#هوش_مصنوعی",
  programming: "#برنامه_نویسی",
  mobile: "#موبایل",
  security: "#امنیت",
  gadgets: "#گجت",
  web: "#وب",
  startup: "#استارتاپ",
  science: "#علم",
  game: "#گیمینگ",
  other: "#تکنولوژی",
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Hashtag line appended under a post, e.g. "#هوش_مصنوعی #اخبار_تک" */
export function hashtagsFor(category: Category): string {
  const tag = CATEGORY_HASHTAGS[category];
  return tag === "#تکنولوژی" ? tag : `${tag} #تکنولوژی`;
}
