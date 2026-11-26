import { describe, expect, it } from "vitest";
import {
  isValidGlobalSlug,
  randomSuffix,
  slugify,
  suggestSlug,
  withSuffix,
} from "./slug";

describe("slug suggestion (V2-13a)", () => {
  it("removes Vietnamese accents and joins words", () => {
    expect(slugify("Đánh giá Công nghệ 2026!")).toBe("danh-gia-cong-nghe-2026");
    expect(slugify("  Sơn   Review  ")).toBe("son-review");
  });

  it("caps the length without a trailing dash", () => {
    const slug = slugify("Một tiêu đề rất rất dài cho trang của công ty");
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug).not.toMatch(/-$/);
  });

  it("keeps a valid title as is", () => {
    expect(suggestSlug("Tech Review", "abcd")).toBe("tech-review");
  });

  it("adds a suffix when the title is reserved, too short or empty", () => {
    expect(suggestSlug("Admin", "abcd")).toBe("admin-abcd");
    expect(suggestSlug("A", "abcd")).toBe("a-abcd");
    expect(suggestSlug("!!!", "abcd")).toBe("trang-abcd");
  });

  it("always returns a valid slug, also for long titles", () => {
    for (const title of [
      "x".repeat(80),
      "Đ",
      "login",
      "Cửa hàng Mỹ phẩm Hà Nội chính hãng giá tốt",
    ]) {
      expect(isValidGlobalSlug(suggestSlug(title))).toBe(true);
      expect(isValidGlobalSlug(withSuffix(slugify(title)))).toBe(true);
    }
  });

  it("makes 4-character base-36 suffixes", () => {
    expect(randomSuffix()).toMatch(/^[a-z0-9]{4}$/);
  });
});
