import { EDITABLE_TYPES } from "@/lib/renderer/blocks";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { templates } from "@/templates";
import {
  PageConfigSchema,
  SiteSchema,
  siteFromConfig,
  summaryOf,
  type RegionName,
} from "./site";

const stored = {
  schemaVersion: 1,
  template: "classic",
  profile: { title: "Son", socials: [] },
};

describe("page config schema v1", () => {
  it("rebuilds a Site from stored config + username/slug", () => {
    const site = siteFromConfig(stored, "son", "tech-review");
    expect(site.slug).toBe("son/tech-review");
    expect(site.schemaVersion).toBe(1);
    expect(site.blocks).toEqual([]);
  });

  it("strips slug and updatedAt for storage", () => {
    const site = siteFromConfig(stored, "son", "tech-review");
    const config = PageConfigSchema.parse({ ...site, updatedAt: "2026-11-24" });
    expect(config).not.toHaveProperty("slug");
    expect(config).not.toHaveProperty("updatedAt");
  });

  it("defaults a missing schemaVersion to 1 and rejects other versions", () => {
    expect(
      SiteSchema.parse({ ...stored, schemaVersion: undefined, slug: "a/b" })
        .schemaVersion,
    ).toBe(1);
    expect(
      SiteSchema.safeParse({ ...stored, schemaVersion: 2, slug: "a/b" })
        .success,
    ).toBe(false);
  });

  it("rejects a slug without username", () => {
    expect(
      SiteSchema.safeParse({ ...stored, slug: "tech-review" }).success,
    ).toBe(false);
  });

  it("summarises unpublished pages without a public slug", () => {
    const site = siteFromConfig(stored, "son", "tech-review");
    expect(summaryOf(site).publishedSlug).toBeNull();
    expect(summaryOf(site, true).publishedSlug).toBe("son/tech-review");
  });

  it("starts every template with valid sample content", () => {
    // Starters may be set in any migration; the latest one per template wins (docs/template-authoring.md).
    const sql = readdirSync("supabase/migrations")
      .sort()
      .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"))
      .join("\n");
    const latest = new Map<string, ReturnType<typeof JSON.parse>>();
    for (const m of sql.matchAll(
      /update public\.templates set default_config = '(\{"schemaVersion".*?\})'::jsonb/g,
    )) {
      const config = JSON.parse(m[1].replaceAll("''", "'"));
      latest.set(config.template, config);
    }
    const configs = [...latest.values()];
    expect(configs.map((c) => c.template).sort()).toEqual(
      Object.keys(templates).sort(),
    );
    for (const config of configs) {
      expect(PageConfigSchema.safeParse(config).success).toBe(true);
      const ids = config.blocks.map((b: { id: string }) => b.id);
      const placed = Object.values(config.layout).flatMap(
        (r) => (r as { blocks: string[] }).blocks,
      );
      expect(placed.sort()).toEqual([...ids].sort());
      // Every starter block is a type the editor can edit, in a region the template allows.
      const tpl = templates[config.template];
      for (const [region, r] of Object.entries(config.layout))
        for (const id of (r as { blocks: string[] }).blocks) {
          const type = config.blocks.find(
            (b: { id: string }) => b.id === id,
          ).type;
          expect(EDITABLE_TYPES).toContain(type);
          expect(tpl.regions[region as RegionName].allow).toContain(type);
        }
    }
  });
});

describe("theme and template switching (V2-06)", () => {
  it("rejects values outside the fixed theme steps", () => {
    for (const theme of [
      { fontSize: "xl" },
      { spacing: "10px" },
      { width: "100vw" },
    ])
      expect(
        SiteSchema.safeParse({ ...stored, slug: "a/b", theme }).success,
      ).toBe(false);
  });

  it("keeps content, layout and theme when the template changes", () => {
    const site = siteFromConfig(
      {
        ...stored,
        theme: { fontSize: "lg", accent: "#ff0000" },
        blocks: [
          { id: "l", type: "link", text: "Shopee", url: "https://shopee.vn" },
        ],
        layout: { main: { blocks: ["l"] } },
      },
      "son",
      "tech-review",
    );
    for (const template of Object.keys(templates)) {
      const switched = siteFromConfig(
        PageConfigSchema.parse({ ...site, template }),
        "son",
        "tech-review",
      );
      expect(switched.template).toBe(template);
      expect(switched.blocks).toEqual(site.blocks);
      expect(switched.layout).toEqual(site.layout);
      expect(switched.theme).toEqual(site.theme);
    }
  });
});
