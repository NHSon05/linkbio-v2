import { describe, expect, it } from "vitest";
import { PageConfigSchema, siteFromConfig } from "@/lib/schemas/site";
import { categoryProducts, findCategory, hasCategoryPath } from "./catalog";

const product = (id: string, extra: object = {}) => ({
  id,
  title: id,
  url: `https://shop.example/${id}`,
  ...extra,
});

const config = (
  categories: unknown,
  products = [product("p1"), product("p2"), product("p3")],
) => ({
  schemaVersion: 1,
  template: "classic",
  profile: { title: "Shop", socials: [] },
  catalog: { products, collections: [], categories },
});

const laptops = {
  id: "c1",
  slug: "laptops",
  name: "Laptop",
  items: ["p1"],
  children: [
    { id: "c1a", slug: "macbook", name: "MacBook", items: ["p2", "p1"] },
    { id: "c1b", slug: "gaming", name: "Gaming", items: ["p3"] },
  ],
};

const parse = (categories: unknown) =>
  PageConfigSchema.safeParse(config(categories));

describe("catalog categories (V2-30b)", () => {
  it("accepts two levels and keeps them through save and reload", () => {
    const saved = PageConfigSchema.parse(config([laptops]));
    const site = siteFromConfig(saved, "tech-review");
    expect(site.catalog?.categories[0].children.map((c) => c.slug)).toEqual([
      "macbook",
      "gaming",
    ]);
  });

  it("defaults categories for configs saved before V2-30", () => {
    const old = { ...config([]), catalog: { products: [], collections: [] } };
    expect(PageConfigSchema.parse(old).catalog?.categories).toEqual([]);
  });

  it("rejects a third level", () => {
    const deep = {
      ...laptops,
      children: [{ ...laptops.children[0], children: [] }],
    };
    expect(parse([deep]).success).toBe(false);
  });

  it.each([
    "Laptops",
    "-x",
    "a/b",
    "../x",
    "lap top",
    "x".repeat(41),
    "",
    "<script>",
  ])("rejects category slug %j", (slug) => {
    expect(parse([{ ...laptops, slug }]).success).toBe(false);
    expect(
      parse([{ ...laptops, children: [{ ...laptops.children[0], slug }] }])
        .success,
    ).toBe(false);
  });

  it("rejects duplicate sibling slugs but allows the same slug under different parents", () => {
    expect(parse([laptops, { ...laptops, id: "c2" }]).success).toBe(false);
    const twoSubs = {
      ...laptops,
      children: [laptops.children[0], { ...laptops.children[0], id: "c1z" }],
    };
    expect(parse([twoSubs]).success).toBe(false);
    const phones = {
      id: "c2",
      slug: "phones",
      name: "Phone",
      items: [],
      children: [{ id: "c2a", slug: "gaming", name: "Gaming", items: [] }],
    };
    expect(parse([laptops, phones]).success).toBe(true);
  });

  it("rejects duplicate ids and items that are not products", () => {
    expect(
      parse([laptops, { ...laptops, id: "c1a", slug: "other" }]).success,
    ).toBe(false);
    expect(parse([{ ...laptops, items: ["nope"] }]).success).toBe(false);
  });

  it("rejects an empty name and non-http product URLs", () => {
    expect(parse([{ ...laptops, name: "  " }]).success).toBe(false);
    const bad = config([], [product("p1", { url: "javascript:alert(1)" })]);
    expect(PageConfigSchema.safeParse(bad).success).toBe(false);
  });
});

describe("category lookup (V2-31)", () => {
  const site = siteFromConfig(
    config(
      [laptops],
      [product("p1"), product("p2"), product("p3", { visible: false })],
    ),
    "tech-review",
  );

  it("finds categories and subcategories by slug, scoped to the parent", () => {
    expect(findCategory(site, "laptops")?.category.id).toBe("c1");
    expect(findCategory(site, "laptops", "macbook")?.subcategory?.id).toBe(
      "c1a",
    );
    expect(findCategory(site, "macbook")).toBeNull();
    expect(findCategory(site, "laptops", "nope")).toBeNull();
    expect(findCategory(site, "nope", "macbook")).toBeNull();
  });

  it("lists visible products once, own items first", () => {
    const ids = (cat: string, sub?: string) =>
      categoryProducts(site, findCategory(site, cat, sub)!).map((p) => p.id);
    expect(ids("laptops")).toEqual(["p1", "p2"]);
    expect(ids("laptops", "macbook")).toEqual(["p2", "p1"]);
    expect(ids("laptops", "gaming")).toEqual([]);
  });

  it("checks raw config JSON defensively for the proxy", () => {
    expect(hasCategoryPath([laptops], "laptops")).toBe(true);
    expect(hasCategoryPath([laptops], "laptops", "gaming")).toBe(true);
    expect(hasCategoryPath([laptops], "laptops", "phones")).toBe(false);
    expect(hasCategoryPath([laptops], "macbook")).toBe(false);
    for (const raw of [
      null,
      undefined,
      "laptops",
      {},
      [null, 1, "x"],
      [{ slug: "laptops", children: "x" }],
    ])
      expect(hasCategoryPath(raw, "laptops", "macbook")).toBe(false);
  });
});
