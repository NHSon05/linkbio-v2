import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
vi.mock("@/lib/auth", () => ({
  DB_SCHEMA: "linktree",
  getSupabaseEnv: () => ({ url: "http://localhost", key: "anon" }),
}));

import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  APP_PATHS,
  isStrayPublicPath,
  lookupPublicPage,
  publicPagePath,
} from "./exists";

/**
 * Every page or route handler URL in src/app, route groups removed. Dynamic segments are kept (e.g.
 * /api/[id]) so a new dynamic app route fails the APP_PATHS test; only (public) owns dynamic routes.
 */
function staticAppPaths(
  dir = join(process.cwd(), "src/app"),
  url = "",
): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory())
      return /^(page|route)\.tsx?$/.test(entry.name) ? [url || "/"] : [];
    if (entry.name === "(public)") return [];
    const next = entry.name.startsWith("(") ? url : `${url}/${entry.name}`;
    return staticAppPaths(join(dir, entry.name), next);
  });
}

type Result = { data: unknown; error: unknown };
const none: Result = { data: null, error: null };
/** Configures what get_published_page answers per path; unknown paths answer no row. */
const answers = (byPath: Record<string, Result>) =>
  rpc.mockImplementation((_: string, { p_path }: { p_path: string }) => ({
    select: () => ({
      maybeSingle: () => Promise.resolve(byPath[p_path] ?? none),
    }),
  }));
const answer = (result: Result) =>
  rpc.mockReturnValue({
    select: () => ({ maybeSingle: () => Promise.resolve(result) }),
  });
const live = (categories: unknown = []): Result => ({
  data: { redirect_to: null, categories },
  error: null,
});
const moved = (to: string): Result => ({
  data: { redirect_to: to },
  error: null,
});
const catalog = [
  { slug: "laptops", children: [{ slug: "macbook" }] },
  { slug: "phones", children: [] },
];

describe("publicPagePath", () => {
  it.each([
    "/tech-review",
    "/son/tech-review",
    "/son/a",
    "/tech-review/laptops/macbook",
  ])("reads %j", (path) => {
    expect(publicPagePath(path)).toBe(path);
  });

  it.each([
    "/",
    "/ab",
    "/login",
    "/dashboard",
    "/auth/confirm",
    "/register/resend",
    "/api/v1",
    "/api/v1/events",
    "/son/a/b/c",
    "/son/Laptops/x",
    "/son/a/" + "x".repeat(41),
    "/login/laptops",
    "/son/",
    "/son/-x",
    "/Tech-Review",
    "/favicon.ico",
    "/_next/static",
  ])("ignores %j", (path) => {
    expect(publicPagePath(path)).toBeNull();
  });
});

describe("isStrayPublicPath (V2-31b)", () => {
  it("lists every static 2–3 segment app route", () => {
    const deep = staticAppPaths().filter((p) =>
      [3, 4].includes(p.split("/").length),
    );
    expect(deep.sort()).toEqual([...APP_PATHS].sort());
  });

  it.each([
    "/login/x",
    "/api/foo",
    "/auth/x",
    "/register/x/y",
    "/dashboard/x",
    "/ab/laptop",
    "/son-hong/-x",
    "/son-hong/Laptop",
    "/son-hong/laptop/Mac",
    "/son-hong//x",
  ])("answers 404 for %j", (path) => {
    expect(isStrayPublicPath(path)).toBe(true);
  });

  it.each([
    ...APP_PATHS,
    "/son-hong",
    "/Son-Hong",
    "/son-hong/laptop",
    "/son-hong/laptop/macbook",
    "/img/mug.svg",
    "/.well-known/security.txt",
    "/_next/x",
    "/a/b/c/d",
  ])("leaves %j to the lookup or to Next", (path) => {
    expect(isStrayPublicPath(path)).toBe(false);
  });
});

describe("lookupPublicPage", () => {
  // Block body: a function returned from beforeEach would run as a cleanup hook.
  beforeEach(() => {
    rpc.mockReset();
  });

  it("finds a live page and asks again next time (a rename must show at once)", async () => {
    answer({ data: { redirect_to: null }, error: null });
    expect(await lookupPublicPage("/live-page")).toBe("page");
    answer({ data: { redirect_to: "/renamed" }, error: null });
    expect(await lookupPublicPage("/live-page")).toEqual({
      redirectTo: "/renamed",
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("get_published_page", {
      p_path: "/live-page",
    });
  });

  it("returns the target of an old address", async () => {
    answer({ data: { redirect_to: "/new-slug" }, error: null });
    expect(await lookupPublicPage("/son/old")).toEqual({
      redirectTo: "/new-slug",
    });
  });

  it("answers null for a missing page", async () => {
    answer({ data: null, error: null });
    expect(await lookupPublicPage("/missing")).toBeNull();
  });

  it.each(["https://evil.example", "//evil.example", "/a/b", "/loop-page"])(
    "rejects redirect target %j",
    async (target) => {
      answer({ data: { redirect_to: target }, error: null });
      expect(await lookupPublicPage("/loop-page")).toBeNull();
    },
  );

  it("treats a Supabase error as a page", async () => {
    answer({ data: null, error: { message: "down" } });
    expect(await lookupPublicPage("/outage")).toBe("page");
  });
  it("finds categories and subcategories of a live page (V2-31b)", async () => {
    answers({ "/shop": live(catalog) });
    expect(await lookupPublicPage("/shop/laptops")).toBe("page");
    expect(await lookupPublicPage("/shop/laptops/macbook")).toBe("page");
    expect(await lookupPublicPage("/shop/phones")).toBe("page");
  });

  it("answers 404 for unknown categories and subcategories", async () => {
    answers({ "/shop": live(catalog) });
    expect(await lookupPublicPage("/shop/tablets")).toBeNull();
    expect(await lookupPublicPage("/shop/laptops/gaming")).toBeNull();
    expect(await lookupPublicPage("/shop/macbook")).toBeNull();
    expect(await lookupPublicPage("/shop/phones/macbook")).toBeNull();
    answers({ "/plain": live(null) });
    expect(await lookupPublicPage("/plain/laptops")).toBeNull();
  });

  it("redirects an old /{username}/{slug} when it is not a category", async () => {
    answers({ "/son/tech-review": moved("/tech-review") });
    expect(await lookupPublicPage("/son/tech-review")).toEqual({
      redirectTo: "/tech-review",
    });
  });

  it("lets an old address win over a live category on the same path (no link capture)", async () => {
    // Another company took the slug "son" and added a category "tech-review": /son/tech-review keeps its 308.
    answers({
      "/son": live([{ slug: "tech-review" }]),
      "/son/tech-review": moved("/tech-review"),
    });
    expect(await lookupPublicPage("/son/tech-review")).toEqual({
      redirectTo: "/tech-review",
    });
    answers({ "/shop": live(catalog), "/shop/old-page": moved("/elsewhere") });
    expect(await lookupPublicPage("/shop/old-page")).toEqual({
      redirectTo: "/elsewhere",
    });
  });

  it("reads the category tree only for category paths", async () => {
    const calls: [string, string][] = [];
    rpc.mockImplementation((_: string, { p_path }: { p_path: string }) => ({
      select: (columns: string) => {
        calls.push([p_path, columns]);
        return { maybeSingle: () => Promise.resolve(live(catalog)) };
      },
    }));
    await lookupPublicPage("/shop");
    await lookupPublicPage("/shop/laptops/macbook");
    await lookupPublicPage("/shop/laptops");
    expect(calls).toEqual([
      ["/shop", "redirect_to"],
      ["/shop", "redirect_to, categories:config->catalog->categories"],
      ["/shop", "redirect_to, categories:config->catalog->categories"],
      ["/shop/laptops", "redirect_to"],
    ]);
  });

  it("keeps the category part when the page was renamed", async () => {
    answers({ "/old-shop": moved("/shop") });
    expect(await lookupPublicPage("/old-shop/laptops")).toEqual({
      redirectTo: "/shop/laptops",
    });
    expect(await lookupPublicPage("/old-shop/laptops/macbook")).toEqual({
      redirectTo: "/shop/laptops/macbook",
    });
  });

  it("prefers an exact old address over a renamed page prefix", async () => {
    answers({
      "/old-shop": moved("/shop"),
      "/old-shop/x-page": moved("/x-page"),
    });
    expect(await lookupPublicPage("/old-shop/x-page")).toEqual({
      redirectTo: "/x-page",
    });
  });

  it("rejects unsafe or looping targets for category paths too", async () => {
    answers({ "/old-shop": moved("https://evil.example") });
    expect(await lookupPublicPage("/old-shop/laptops")).toBeNull();
    answers({ "/old-shop": moved("/old-shop") });
    expect(await lookupPublicPage("/old-shop/laptops")).toBeNull();
  });

  it("treats a Supabase error on either lookup as a page", async () => {
    rpc.mockImplementation((_: string, { p_path }: { p_path: string }) => ({
      select: () => ({
        maybeSingle: () =>
          Promise.resolve(
            p_path === "/shop"
              ? live(catalog)
              : { data: null, error: { message: "down" } },
          ),
      }),
    }));
    expect(await lookupPublicPage("/shop/unknown")).toBe("page");
  });
});
