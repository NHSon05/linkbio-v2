/**
 * Template manifest: một file, hai nơi dùng (plan mục 5).
 * Astro đọc để render đúng vùng, dashboard đọc để biết vùng nào nhận block gì.
 * Thêm template mới: tạo thư mục <id>/template.json rồi thêm vào danh sách dưới.
 */
import { TemplateSchema, type Template } from "@/lib/schemas/site";
import classic from "./classic/template.json" with { type: "json" };
import videoFirst from "./video-first/template.json" with { type: "json" };
import shopGrid from "./shop-grid/template.json" with { type: "json" };

const raw = [classic, videoFirst, shopGrid];

export const templates: Record<string, Template> = Object.fromEntries(
  raw.map((t) => {
    const parsed = TemplateSchema.parse(t);
    return [parsed.id, parsed];
  }),
);

export const templateIds = Object.keys(templates);
