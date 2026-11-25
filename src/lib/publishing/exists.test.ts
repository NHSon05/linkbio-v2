import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { publicPagePath } from "./exists";

describe("publicPagePath", () => {
  it("reads /{username}/{slug}", () => {
    expect(publicPagePath("/son/tech-review")).toEqual({
      username: "son",
      slug: "tech-review",
    });
  });

  it.each([
    "/",
    "/login",
    "/auth/confirm",
    "/register/resend",
    "/api/v1",
    "/son/a/b",
    "/son/",
  ])("ignores %j", (path) => {
    const parts = publicPagePath(path);
    // "/son/" splits into a valid shape with an empty slug; publicPageExists rejects that slug.
    expect(parts === null || parts.slug === "").toBe(true);
  });
});
