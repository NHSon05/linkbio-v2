import { describe, expect, it } from "vitest";
import { fillDays, vietnamToday } from "./analytics";
import { createRateLimiter } from "./rate-limit";

describe("fillDays", () => {
  it("returns every day in the window, zero-filled, ending today", () => {
    const rows = [{ day: "2026-11-24", views: 5, clicks: 2 }];
    expect(fillDays(rows, 3, "2026-11-25")).toEqual([
      { day: "2026-11-23", views: 0, clicks: 0 },
      { day: "2026-11-24", views: 5, clicks: 2 },
      { day: "2026-11-25", views: 0, clicks: 0 },
    ]);
  });
  it("uses the Vietnam date", () => {
    // 2026-11-24 18:30 UTC is already 25 Nov in Vietnam (UTC+7).
    expect(vietnamToday(new Date("2026-11-24T18:30:00Z"))).toBe("2026-11-25");
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit per window and key", () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow("a", 0), allow("a", 1), allow("a", 2)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(allow("b", 2)).toBe(true);
    expect(allow("a", 1000)).toBe(true);
  });
});
