import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
vi.mock("@/lib/auth", () => ({
  DB_SCHEMA: "linktree",
  getSupabaseEnv: () => ({ url: "http://localhost", key: "anon" }),
}));

import { lookupPublicPage, publicPagePath } from "./exists";

const answer = (result: { data: unknown; error: unknown }) =>
  rpc.mockReturnValue({
    select: () => ({ maybeSingle: () => Promise.resolve(result) }),
  });

describe("publicPagePath", () => {
  it.each(["/tech-review", "/son/tech-review", "/son/a"])("reads %j", (path) => {
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
    "/son/a/b",
    "/son/",
    "/son/-x",
    "/Tech-Review",
    "/favicon.ico",
    "/_next/static",
  ])("ignores %j", (path) => {
    expect(publicPagePath(path)).toBeNull();
  });
});

describe("lookupPublicPage", () => {
  beforeEach(() => rpc.mockReset());

  it("finds a live page and asks again next time (a rename must show at once)", async () => {
    answer({ data: { redirect_to: null }, error: null });
    expect(await lookupPublicPage("/live-page")).toBe("page");
    answer({ data: { redirect_to: "/renamed" }, error: null });
    expect(await lookupPublicPage("/live-page")).toEqual({ redirectTo: "/renamed" });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("get_published_page", { p_path: "/live-page" });
  });

  it("returns the target of an old address", async () => {
    answer({ data: { redirect_to: "/new-slug" }, error: null });
    expect(await lookupPublicPage("/son/old")).toEqual({ redirectTo: "/new-slug" });
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
});
