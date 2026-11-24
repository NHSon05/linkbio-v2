import { ProductDbSchema, type ProductDb, type Site } from "@/components/dashboard/mock/schema";
import samples from "./products.json" with { type: "json" };

const legacy = ProductDbSchema.parse(samples);

/** Trang cũ dùng các bộ sưu tập từ dữ liệu mẫu cho đến khi lưu danh mục riêng. */
export function catalogFor(site: Site): ProductDb {
  if (site.catalog) return site.catalog;
  const collectionIds = new Set<string>();
  for (const shop of site.blocks.filter((block) => block.type === "shop")) {
    const ids = Array.isArray(shop.collections) ? shop.collections : [];
    const matches = legacy.collections.filter((collection) => ids.includes(collection.id));
    for (const collection of matches.length ? matches : legacy.collections.slice(0, 1)) {
      collectionIds.add(collection.id);
    }
  }
  const collections = legacy.collections.filter((collection) => collectionIds.has(collection.id));
  const itemIds = new Set(collections.flatMap((collection) => collection.items));
  return { collections, products: legacy.products.filter((product) => itemIds.has(product.id)) };
}
