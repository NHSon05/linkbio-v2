import { describe, expect, it } from "vitest";
import { safeUrl, videoEmbed } from "./blocks";

describe("safeUrl", () => {
  it("keeps http(s) and same-site paths", () => {
    expect(safeUrl("https://shopee.vn/a")).toBe("https://shopee.vn/a");
    expect(safeUrl(" /img/a.png ")).toBe("/img/a.png");
  });
  it("drops script and other protocols", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,x",
      "//evil.com",
      "/\\evil.com",
      "vbscript:x",
      "",
      undefined,
      42,
    ])
      expect(safeUrl(bad)).toBeUndefined();
  });
});

describe("videoEmbed", () => {
  it("embeds YouTube and TikTok only", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbed("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(
      videoEmbed("https://www.tiktok.com/@a/video/7234567890123456789"),
    ).toBe("https://www.tiktok.com/embed/v2/7234567890123456789");
    expect(videoEmbed("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeUndefined();
    expect(
      videoEmbed("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"),
    ).toBeUndefined();
    expect(videoEmbed("javascript:alert(1)")).toBeUndefined();
  });
});
