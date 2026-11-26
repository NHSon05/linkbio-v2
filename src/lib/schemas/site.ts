/**
 * Page config schema v1 — dùng chung cho dashboard, renderer và public page.
 * Gốc từ bio-link (packages/schema): theme, layout, vùng, xếp hạng.
 */
import { z } from "zod";

export const REGIONS = ["hero", "main", "footer"] as const; // header luôn là ProfileHeader
export type RegionName = (typeof REGIONS)[number];

export const BLOCK_TYPES = [
  "hero-video",
  "carousel",
  "card",
  "link",
  "banner",
  "release",
  "video",
  "events",
  "products",
  "subscribe",
  "shop",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const VARIANTS = ["list", "grid-2", "carousel"] as const;
export type Variant = (typeof VARIANTS)[number];

export const DESKTOP_LAYOUTS = ["center", "split", "grid"] as const;

// ---------- Theme ----------
export const ThemeSchema = z.object({
  bg: z.string().optional(),
  accent: z.string().optional(),
  font: z.string().optional(),
  radius: z.union([z.number(), z.string()]).optional(),
  button: z.enum(["pill", "rounded"]).optional(),
  // V2-06: fixed steps only, so a page can never carry arbitrary CSS values.
  fontSize: z.enum(["sm", "md", "lg"]).optional(),
  spacing: z.enum(["compact", "normal", "relaxed"]).optional(),
  width: z.enum(["narrow", "normal", "wide"]).optional(),
});
export type Theme = z.infer<typeof ThemeSchema>;

// ---------- Template manifest ----------
export const RegionSpecSchema = z.object({
  label: z.string().optional(),
  allow: z.array(z.string()).optional(),
  max: z.number().int().positive().optional(),
  rank: z.boolean().optional(),
  variants: z.array(z.enum(VARIANTS)).optional(),
  defaultVariant: z.enum(VARIANTS).optional(),
});
export type RegionSpec = z.infer<typeof RegionSpecSchema>;

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  desktop: z.enum(DESKTOP_LAYOUTS).default("center"),
  desktopColumns: z.number().int().min(1).max(3).default(2),
  regions: z.object({
    header: RegionSpecSchema,
    hero: RegionSpecSchema,
    main: RegionSpecSchema,
    footer: RegionSpecSchema,
  }),
  themeDefaults: ThemeSchema.default({}),
});
export type Template = z.infer<typeof TemplateSchema>;

// ---------- Blocks ----------
const ItemSchema = z.looseObject({
  id: z.string().optional(),
  text: z.string().optional(),
  thumbnail: z.string().optional(),
  url: z.string().optional(),
});

/** Block để "loose": mỗi type có field riêng; type lạ bị bỏ qua lúc render thay vì làm vỡ build. */
export const BlockSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  navLabel: z.string().optional(),
  text: z.string().optional(),
  subtext: z.string().optional(),
  thumbnail: z.string().optional(),
  url: z.string().optional(),
  viewAll: z.string().optional(),
  pinned: z.boolean().optional(),
  hidden: z.boolean().optional(),
  score: z.number().optional(),
  publishedAt: z.string().optional(),
  size: z.enum(["wide", "normal"]).optional(),
  items: z.array(ItemSchema).optional(),
});
export type Block = z.infer<typeof BlockSchema>;

// ---------- Products (affiliate) ----------
export const ProductSchema = z.object({
  id: z.string(),
  url: z.httpUrl(),
  affiliateUrl: z.httpUrl().optional(),
  title: z.string(),
  image: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  visible: z.boolean().optional(),
});
export const ProductDbSchema = z.object({
  products: z.array(ProductSchema),
  collections: z.array(
    z.object({ id: z.string(), name: z.string(), items: z.array(z.string()) }),
  ),
});
export type Product = z.infer<typeof ProductSchema>;
export type ProductDb = z.infer<typeof ProductDbSchema>;

// ---------- Site (1 slug) ----------
export const SCHEMA_VERSION = 1;

const RegionLayoutSchema = z.object({
  blocks: z.array(z.string()).default([]),
  variant: z.enum(VARIANTS).optional(),
  rank: z.boolean().optional(),
});

export const SiteSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  // V2-12b: global public address /{slug} (same rule as pages.slug_format and GLOBAL_SLUG).
  slug: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]{2,29}$/,
      "slug dùng 3–30 ký tự a-z, 0-9 hoặc -, bắt đầu bằng chữ hoặc số",
    ),
  source: z.object({ platform: z.string(), pageId: z.string() }).optional(),
  template: z.string().default("classic"),
  theme: ThemeSchema.default({}),
  layout: z
    .object({
      hero: RegionLayoutSchema.optional(),
      main: RegionLayoutSchema.optional(),
      footer: RegionLayoutSchema.optional(),
    })
    .default({}),
  nav: z.boolean().optional(),
  profile: z.object({
    cover: z.string().optional(),
    avatar: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    about: z.string().optional(),
    socials: z
      .array(z.object({ type: z.string(), url: z.string() }))
      .default([]),
  }),
  blocks: z.array(BlockSchema).default([]),
  catalog: ProductDbSchema.optional(),
  updatedAt: z.string().optional(),
});
export type Site = z.infer<typeof SiteSchema>;

/** Dạng lưu trong page_versions.config: slug/updatedAt là metadata của bảng pages, không lưu trong config. */
export const PageConfigSchema = SiteSchema.omit({
  slug: true,
  updatedAt: true,
});
export type PageConfig = z.infer<typeof PageConfigSchema>;

/** Rebuilds the editor's Site from a stored config plus the page's slug (public path /{slug}). */
export function siteFromConfig(config: unknown, slug: string): Site {
  return SiteSchema.parse({ ...(config as object), slug });
}

/** What the dashboard shows for a page in lists, the slug switcher and search. */
export type SiteSummary = {
  slug: string;
  title: string;
  template: string;
  platform: string | null;
  canEdit: boolean;
  /** Set once the page has a live version (Sprint 3). */
  publishedSlug: string | null;
};

export function summaryOf(site: Site, published = false): SiteSummary {
  return {
    slug: site.slug,
    title: site.profile.title,
    template: site.template,
    platform: site.source?.platform ?? null,
    canEdit: true,
    publishedSlug: published ? site.slug : null,
  };
}

// ---------- Logic (giữ giống demo/assets/render.js) ----------
const WIDE_BY_DEFAULT = new Set<string>([
  "hero-video",
  "carousel",
  "banner",
  "link",
  "release",
  "video",
  "events",
  "products",
  "subscribe",
  "shop",
]);

export function isWide(b: Block): boolean {
  if (b.size === "wide") return true;
  if (b.size === "normal") return false;
  return WIDE_BY_DEFAULT.has(b.type);
}

export function templateOf(
  site: Site,
  templates: Record<string, Template>,
): Template {
  const t = templates[site.template] ?? templates.classic;
  if (!t) throw new Error(`Không tìm thấy template "${site.template}"`);
  return t;
}

/** Theme = themeDefaults của template + phần slug ghi đè (bỏ giá trị rỗng). */
export function themeOf(site: Site, tpl: Template): Theme {
  const out: Record<string, unknown> = { ...tpl.themeDefaults };
  for (const [k, v] of Object.entries(site.theme ?? {}))
    if (v !== "" && v != null) out[k] = v;
  return out as Theme;
}

/** JSON kiểu cũ (chưa có vùng) thì dồn hết block vào main. */
export function layoutOf(site: Site): Required<Site["layout"]> {
  const L = site.layout ?? {};
  if (L.hero || L.main || L.footer) {
    return {
      hero: L.hero ?? { blocks: [] },
      main: L.main ?? { blocks: [] },
      footer: L.footer ?? { blocks: [] },
    };
  }
  return {
    hero: { blocks: [] },
    main: { blocks: site.blocks.map((b) => b.id) },
    footer: { blocks: [] },
  };
}

export function variantOf(
  site: Site,
  tpl: Template,
  name: RegionName,
): Variant {
  const spec = tpl.regions[name];
  const v = layoutOf(site)[name]?.variant;
  const vs = spec.variants ?? ["list"];
  return v && vs.includes(v) ? v : (spec.defaultVariant ?? vs[0]);
}

/** Vùng có tự xếp theo viral không: slug ghi đè → manifest → mặc định chỉ main. */
export function rankOf(site: Site, tpl: Template, name: RegionName): boolean {
  const r = layoutOf(site)[name]?.rank;
  if (r != null) return r;
  const spec = tpl.regions[name];
  return spec.rank ?? name === "main";
}

/** Quy tắc xếp: pinned → viral score → mới nhất → thứ tự gốc. */
export function sortBlocks<
  T extends Pick<Block, "pinned" | "score" | "publishedAt">,
>(blocks: T[]): T[] {
  return blocks
    .map((b, i) => ({ b, i }))
    .sort((x, y) => {
      const px = x.b.pinned ? 1 : 0,
        py = y.b.pinned ? 1 : 0;
      if (px !== py) return py - px;
      const sx = typeof x.b.score === "number" ? x.b.score : -1;
      const sy = typeof y.b.score === "number" ? y.b.score : -1;
      if (sx !== sy) return sy - sx;
      const dx = Date.parse(x.b.publishedAt ?? "") || 0;
      const dy = Date.parse(y.b.publishedAt ?? "") || 0;
      if (dx !== dy) return dy - dx;
      return x.i - y.i;
    })
    .map((o) => o.b);
}

/** Block của 1 vùng: lọc theo allow, bỏ block ẩn, xếp hạng trong vùng, cắt theo max. */
export function regionBlocks(
  site: Site,
  tpl: Template,
  name: RegionName,
): Block[] {
  const spec = tpl.regions[name];
  const byId = new Map(site.blocks.map((b) => [b.id, b]));
  let list = (layoutOf(site)[name]?.blocks ?? [])
    .map((id) => byId.get(id))
    .filter(
      (b): b is Block =>
        !!b && !b.hidden && (!spec.allow || spec.allow.includes(b.type)),
    );
  if (rankOf(site, tpl, name)) list = sortBlocks(list);
  if (spec.max) list = list.slice(0, spec.max);
  return list;
}

export function formatPrice(
  price: Product["price"],
  currency?: string,
): string {
  if (price == null || price === "") return "";
  const n = Number(price);
  if (Number.isNaN(n)) return String(price);
  if (currency === "USD") return "$" + n.toFixed(2);
  return n.toLocaleString("vi-VN") + "₫";
}

/** Độ sáng màu nền (0–1) — quyết định theme tối/sáng. */
export function luminance(hex?: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (
    (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) /
    255
  );
}
