import { describe, expect, it } from "vitest";
import { sniffImage } from "./media";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((p) =>
      typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p,
    ),
  );

describe("sniffImage", () => {
  it("recognises JPEG, PNG, WebP and AVIF by content", () => {
    expect(sniffImage(bytes([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe(
      "image/jpeg",
    );
    expect(sniffImage(bytes("\x89PNG\r\n\x1a\n", [0, 0]))?.mime).toBe(
      "image/png",
    );
    expect(sniffImage(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "))?.mime).toBe(
      "image/webp",
    );
    expect(sniffImage(bytes([0, 0, 0, 28], "ftypavif"))?.mime).toBe(
      "image/avif",
    );
  });
  it("rejects other content even if named like an image", () => {
    expect(sniffImage(bytes("<svg onload=alert(1)>"))).toBeUndefined();
    expect(sniffImage(bytes("<html><script>"))).toBeUndefined();
    expect(sniffImage(bytes("GIF89a"))).toBeUndefined();
    expect(sniffImage(new Uint8Array())).toBeUndefined();
  });
});
