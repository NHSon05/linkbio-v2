import type {
  Category,
  Product,
  ProductDb,
  Site,
  Subcategory,
} from "@/lib/schemas/site";

/** FE-06: products live in the page config (saved with the draft, published with the page). */
export function catalogFor(site: Site): ProductDb {
  return site.catalog ?? { products: [], collections: [], categories: [] };
}

export type CategoryMatch = { category: Category; subcategory?: Subcategory };

/** V2-31: the category (and subcategory) a public path names, or null when the page has none by that slug. */
export function findCategory(
  site: Site,
  category: string,
  subcategory?: string,
): CategoryMatch | null {
  const found = catalogFor(site).categories.find((c) => c.slug === category);
  if (!found) return null;
  if (subcategory === undefined) return { category: found };
  const sub = found.children.find((c) => c.slug === subcategory);
  return sub ? { category: found, subcategory: sub } : null;
}

/**
 * Visible products of a category view, in display order. A subcategory lists its own items; a category
 * lists its own items, then its subcategories' items, each product once.
 */
export function categoryProducts(site: Site, match: CategoryMatch): Product[] {
  const ids = match.subcategory
    ? match.subcategory.items
    : [
        ...match.category.items,
        ...match.category.children.flatMap((c) => c.items),
      ];
  const byId = new Map(catalogFor(site).products.map((p) => [p.id, p]));
  return [...new Set(ids)].flatMap((id) => {
    const product = byId.get(id);
    return product && product.visible !== false ? [product] : [];
  });
}

/**
 * For the proxy, before the config is validated: whether raw `catalog.categories` JSON has this path.
 * Only reads strings, so malformed data just answers false.
 */
export function hasCategoryPath(
  categories: unknown,
  category: string,
  subcategory?: string,
): boolean {
  if (!Array.isArray(categories)) return false;
  const found = categories.find(
    (c): c is { slug: string; children?: unknown } =>
      !!c &&
      typeof c === "object" &&
      (c as { slug?: unknown }).slug === category,
  );
  if (!found) return false;
  if (subcategory === undefined) return true;
  return (
    Array.isArray(found.children) &&
    found.children.some(
      (c) =>
        !!c &&
        typeof c === "object" &&
        (c as { slug?: unknown }).slug === subcategory,
    )
  );
}
