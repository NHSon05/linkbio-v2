import type { Block } from "@/lib/schemas/site";

/** A form field the block editor shows; `key` is the Block property it edits. */
export type BlockField = {
  key: "text" | "subtext" | "title" | "url" | "thumbnail";
  label: string;
  kind: "text" | "textarea" | "url";
  placeholder?: string;
};

type BlockSpec = {
  label: string;
  hint?: string;
  fields: BlockField[];
  /** Content for a newly added block (id and type are added by the editor). */
  create: () => Partial<Block>;
};

/** Block types users can add and edit in v1. Other types in old data are rendered as nothing. */
export const BLOCK_SPECS: Record<string, BlockSpec> = {
  link: {
    label: "Nút liên kết",
    fields: [
      { key: "text", label: "Chữ trên nút", kind: "text" },
      { key: "url", label: "Liên kết", kind: "url", placeholder: "https://…" },
    ],
    create: () => ({ text: "Liên kết mới", url: "" }),
  },
  card: {
    label: "Thẻ nội dung",
    fields: [
      { key: "text", label: "Tiêu đề", kind: "text" },
      { key: "subtext", label: "Mô tả", kind: "textarea" },
      {
        key: "thumbnail",
        label: "Ảnh (đường dẫn)",
        kind: "url",
        placeholder: "https://…",
      },
      {
        key: "url",
        label: "Liên kết khi bấm",
        kind: "url",
        placeholder: "https://…",
      },
    ],
    create: () => ({ text: "Thẻ mới", subtext: "" }),
  },
  banner: {
    label: "Banner",
    fields: [
      { key: "text", label: "Tiêu đề lớn", kind: "text" },
      { key: "subtext", label: "Dòng phụ", kind: "text" },
      {
        key: "thumbnail",
        label: "Ảnh nền (đường dẫn)",
        kind: "url",
        placeholder: "https://…",
      },
      {
        key: "url",
        label: "Liên kết khi bấm",
        kind: "url",
        placeholder: "https://…",
      },
    ],
    create: () => ({ text: "Ưu đãi hôm nay", subtext: "" }),
  },
  video: {
    label: "Video",
    hint: "Dán link YouTube hoặc TikTok.",
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      {
        key: "url",
        label: "Link video",
        kind: "url",
        placeholder: "https://youtube.com/watch?v=…",
      },
    ],
    create: () => ({ title: "Video mới", url: "" }),
  },
  shop: {
    label: "Cửa hàng",
    hint: "Hiển thị sản phẩm ở tab Sản phẩm affiliate.",
    fields: [{ key: "title", label: "Tiêu đề", kind: "text" }],
    create: () => ({ title: "Sản phẩm của mình" }),
  },
};

export const EDITABLE_TYPES = Object.keys(BLOCK_SPECS);

/** Short name for a block in lists. */
export function blockLabel(block: Block) {
  return (
    block.title || block.text || BLOCK_SPECS[block.type]?.label || block.type
  );
}

/** Only http(s) and same-site paths may become links or images; anything else is dropped. */
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  // shortcut: blob: is a local image picked in the editor; it only works in that browser until uploads land (FE-05).
  if (url.startsWith("blob:")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** YouTube/TikTok page URL → embed URL. Other hosts are never embedded. */
export function videoEmbed(value: unknown): string | undefined {
  const href = safeUrl(value);
  if (!href || href.startsWith("/") || href.startsWith("blob:"))
    return undefined;
  const url = new URL(href);
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | undefined;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com")
    id =
      url.pathname === "/watch"
        ? (url.searchParams.get("v") ?? undefined)
        : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
  if (id && /^[\w-]{6,20}$/.test(id))
    return `https://www.youtube-nocookie.com/embed/${id}`;
  const tiktok =
    host === "tiktok.com" && url.pathname.match(/\/video\/(\d{8,25})/)?.[1];
  if (tiktok) return `https://www.tiktok.com/embed/v2/${tiktok}`;
  return undefined;
}
