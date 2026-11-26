import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_USERNAMES } from "@/lib/schemas/username";

// V2-12b: /{slug} shares the top level with app routes, so every route name must be reserved, in TS and SQL.
const root = process.cwd();

function topLevelRoutes(dir = join(root, "src/app")): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      entry.name.startsWith("(")
        ? topLevelRoutes(join(dir, entry.name))
        : /^[\[_]/.test(entry.name)
          ? []
          : [entry.name],
    );
}

function sqlReservedNames() {
  const sql = readFileSync(
    join(root, "supabase/migrations/20261126120000_global_slug.sql"),
    "utf8",
  );
  const body = /reserved_names\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/.exec(
    sql,
  )?.[1];
  return [...(body ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("reserved names (V2-12b)", () => {
  it("SQL reserved_names() matches RESERVED_USERNAMES", () => {
    expect(sqlReservedNames().sort()).toEqual([...RESERVED_USERNAMES].sort());
  });

  it("reserves every top-level app route", () => {
    const routes = topLevelRoutes();
    expect(routes).toContain("login");
    for (const route of routes) expect(RESERVED_USERNAMES).toContain(route);
  });
});
