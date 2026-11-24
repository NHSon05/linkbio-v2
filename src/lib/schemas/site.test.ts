import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { templates } from "@/components/dashboard/mock/templates";
import {
  PageConfigSchema,
  SiteSchema,
  siteFromConfig,
  summaryOf,
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

  it("seeds every template's default_config as a valid PageConfig", () => {
    const sql = readFileSync(
      "supabase/migrations/20261124120100_templates.sql",
      "utf8",
    );
    const configs = [...sql.matchAll(/'(\{"schemaVersion".*?\})'::jsonb/g)].map(
      (m) => JSON.parse(m[1].replaceAll("''", "'")),
    );
    expect(configs.map((c) => c.template).sort()).toEqual(
      Object.keys(templates).sort(),
    );
    for (const config of configs)
      expect(PageConfigSchema.safeParse(config).success).toBe(true);
  });
});
