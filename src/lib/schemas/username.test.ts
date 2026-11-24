import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RESERVED_USERNAMES, UsernameSchema } from "./username";

describe("UsernameSchema", () => {
  it("lowercases and trims", () => {
    expect(UsernameSchema.parse("  Son-05 ")).toBe("son-05");
  });

  it.each(["ab", "-son", "son_05", "a".repeat(31), "sơn"])(
    "rejects %j",
    (name) => {
      expect(UsernameSchema.safeParse(name).success).toBe(false);
    },
  );

  it("rejects reserved names", () => {
    expect(UsernameSchema.safeParse("Login").success).toBe(false);
  });

  it("matches the reserved list in the profiles migration", () => {
    const sql = readFileSync(
      "supabase/migrations/20261124120000_profiles.sql",
      "utf8",
    );
    const block = sql.slice(
      sql.indexOf("not in ("),
      sql.indexOf(")", sql.indexOf("not in (")),
    );
    const fromSql = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
    expect([...RESERVED_USERNAMES].sort()).toEqual(fromSql);
  });
});
