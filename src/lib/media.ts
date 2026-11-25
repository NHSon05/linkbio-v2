/** Matches media_assets.bytes and the `media` bucket's file_size_limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** Detects the image type from the file's first bytes; the browser's MIME type is not trusted. */
export function sniffImage(
  bytes: Uint8Array,
): { mime: string; ext: string } | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { mime: "image/jpeg", ext: "jpg" };
  if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n")
    return { mime: "image/png", ext: "png" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  if (
    ascii(bytes, 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(ascii(bytes, 8, 12))
  )
    return { mime: "image/avif", ext: "avif" };
  return undefined;
}
