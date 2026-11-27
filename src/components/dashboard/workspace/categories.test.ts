import { describe, expect, it } from "vitest";
import { PageConfigSchema, siteFromConfig } from "@/lib/schemas/site";
import {
  addCategory,
  assignProduct,
  categorySlug,
  editCategory,
  removeCategory,
  removeProduct,
  siblingSlugs,
  slugProblem,
} from "./categories";

const product = (id: string) => ({
  id,
  title: id,
  url: `https://shop.example/${id}`,
});

const draft = () =>
  siteFromConfig(
    {
      profile: { title: "Shop", socials: [] },
      catalog: {
        products: [product("p1"), product("p2")],
        collections: [{ id: "all", name: "Tất cả", items: ["p1", "p2"] }],
      },
    },
    "tech-shop",
  );

const valid = (site: ReturnType<typeof draft>) =>
  PageConfigSchema.safeParse(site).success;

describe("category draft edits (V2-30c)", () => {
  it("adds, renames and nests categories that still pass PageConfigSchema", () => {
    const site = draft();
    addCategory(site, { name: "Laptop", slug: "laptop" });
    const laptop = site.catalog!.categories[0];
    addCategory(site, { name: "MacBook", slug: "macbook" }, laptop.id);
    editCategory(site, laptop.id, { name: "Máy tính", slug: "may-tinh" });

    const [cat] = site.catalog!.categories;
    expect(cat).toMatchObject({ name: "Máy tính", slug: "may-tinh" });
    expect(cat.children.map((c) => c.slug)).toEqual(["macbook"]);
    expect(valid(site)).toBe(true);
    // Reloading the saved config gives the same tree.
    const saved = PageConfigSchema.parse(site);
    expect(siteFromConfig(saved, "tech-shop").catalog).toEqual(site.catalog);
  });

  it("assigns a product, then deleting it cleans every category", () => {
    const site = draft();
    addCategory(site, { name: "Laptop", slug: "laptop" });
    const laptop = site.catalog!.categories[0];
    addCategory(site, { name: "MacBook", slug: "macbook" }, laptop.id);
    const mac = site.catalog!.categories[0].children[0];

    assignProduct(site, "p1", [laptop.id, mac.id]);
    assignProduct(site, "p2", [mac.id]);
    assignProduct(site, "p1", [mac.id]); // unchecking Laptop keeps the MacBook order
    expect(site.catalog!.categories[0].items).toEqual([]);
    expect(site.catalog!.categories[0].children[0].items).toEqual(["p1", "p2"]);

    removeProduct(site, "p1");
    expect(site.catalog!.categories[0].children[0].items).toEqual(["p2"]);
    expect(site.catalog!.collections[0].items).toEqual(["p2"]);
    expect(valid(site)).toBe(true);
  });

  it("removes a category with its subcategories, or one subcategory", () => {
    const site = draft();
    addCategory(site, { name: "A", slug: "a" });
    addCategory(site, { name: "B", slug: "b" });
    const [a, b] = site.catalog!.categories;
    addCategory(site, { name: "A1", slug: "a1" }, a.id);
    addCategory(site, { name: "B1", slug: "b1" }, b.id);
    addCategory(site, { name: "B2", slug: "b2" }, b.id);

    removeCategory(site, a.id);
    removeCategory(site, site.catalog!.categories[0].children[0].id);
    expect(site.catalog!.categories.map((c) => c.slug)).toEqual(["b"]);
    expect(site.catalog!.categories[0].children.map((c) => c.slug)).toEqual([
      "b2",
    ]);
    expect(valid(site)).toBe(true);
  });

  it("derives a valid slug from the name and avoids sibling slugs", () => {
    expect(categorySlug("Điện thoại & Phụ kiện", [])).toBe(
      "dien-thoai-phu-kien",
    );
    expect(categorySlug("Laptop", ["laptop"], "ab12")).toBe("laptop-ab12");
    expect(categorySlug("!!!", [], "ab12")).toBe("trang-ab12");
  });

  it("flags invalid and sibling-duplicate slugs only", () => {
    const site = draft();
    addCategory(site, { name: "Laptop", slug: "laptop" });
    const laptop = site.catalog!.categories[0];
    addCategory(site, { name: "Laptop", slug: "laptop" }, laptop.id);

    expect(slugProblem("Laptop", [])).not.toBe("");
    expect(slugProblem("-a", [])).not.toBe("");
    expect(slugProblem("a".repeat(41), [])).not.toBe("");
    expect(slugProblem("laptop", siblingSlugs(site))).not.toBe("");
    expect(slugProblem("laptop", siblingSlugs(site, laptop.id))).not.toBe("");
    // Keeping your own slug is fine, and the same slug on another level saves.
    expect(
      slugProblem("laptop", siblingSlugs(site, undefined, laptop.id)),
    ).toBe("");
    expect(valid(site)).toBe(true);
  });
});
