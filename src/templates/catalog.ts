import type { ProductDb, Site } from "@/lib/schemas/site";

/** FE-06: products live in the page config (saved with the draft, published with the page). */
export function catalogFor(site: Site): ProductDb {
  return site.catalog ?? { products: [], collections: [] };
}
