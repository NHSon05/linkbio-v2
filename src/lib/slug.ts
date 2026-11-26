import { RESERVED_USERNAMES } from "@/lib/schemas/username";

// V2-13a: system-wide /{slug} uses the same top-level namespace as usernames today, so it follows the
// username rule (3–30 chars) and the reserved list until Q6 (sprint-plan-v2.md) sets slug rules.
export const GLOBAL_SLUG = /^[a-z0-9][a-z0-9-]{2,29}$/;
const MAX = 30;
const SUFFIX = 4;
const FALLBACK = "trang";
const reserved = new Set<string>(RESERVED_USERNAMES);

export const isValidGlobalSlug = (slug: string) =>
  GLOBAL_SLUG.test(slug) && !reserved.has(slug);

/** Random lower-case base-36 characters (crypto, so suffixes are hard to guess in bulk). */
export function randomSuffix(length = SUFFIX) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Turns a title into slug form: Vietnamese accents removed, lower-case, words joined by "-". May be invalid (too short, reserved). */
export function slugify(title: string) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/, "");
}

/** `base-xxxx`, cut so the result stays within the length limit. */
export function withSuffix(base: string, suffix = randomSuffix()) {
  const head = base.slice(0, MAX - suffix.length - 1).replace(/-+$/, "");
  return `${head || FALLBACK}-${suffix}`;
}

/**
 * A slug to pre-fill when creating a page. Returns the plain slug when it is valid; otherwise (too short,
 * reserved, empty title) a suffixed one. Availability is checked by the database (V2-13b): when the
 * suggestion is taken, call withSuffix(slugify(title)).
 */
export function suggestSlug(title: string, suffix = randomSuffix()) {
  const base = slugify(title);
  return isValidGlobalSlug(base) ? base : withSuffix(base, suffix);
}
