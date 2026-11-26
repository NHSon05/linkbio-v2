"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient, requireUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/media";
import { atLeast, getMembership } from "@/lib/pages";
import { pageTag, pathTag } from "@/lib/publishing/published";
import { createRateLimiter } from "@/lib/rate-limit";
import { PageConfigSchema, type Site } from "@/lib/schemas/site";
import {
  GLOBAL_SLUG,
  isValidGlobalSlug,
  slugify,
  withSuffix,
} from "@/lib/slug";

const SLUG_HINT =
  "Slug dài 3–30 ký tự, gồm chữ thường, số hoặc dấu gạch ngang, và không trùng tên hệ thống.";
const SLUG_TAKEN = "Slug này đã được dùng.";
const FORBIDDEN = "Vai trò của bạn không được làm việc này.";
const NO_COMPANY = "Tài khoản chưa thuộc công ty nào. Liên hệ quản trị viên.";
const PAGE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreatePageState = {
  slug?: string;
  template?: string;
  error?: string;
  /** A free-looking slug to offer after SLUG_TAKEN (V2-13b). */
  suggestion?: string;
};

/** FE-03: create a page from a template through the create_page() database function. */
export async function createPage(
  _: CreatePageState,
  form: FormData,
): Promise<CreatePageState> {
  const slug = String(form.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const template = String(form.get("template") ?? "");
  if (!isValidGlobalSlug(slug)) return { slug, template, error: SLUG_HINT };

  await requireUser();
  const supabase = await createSessionClient();
  const { error, status } = await supabase.rpc("create_page", {
    p_template_key: template,
    p_slug: slug,
  });
  if (error) {
    // Codes from create_page(): SLUG_TAKEN 409, INVALID_SLUG 400, TEMPLATE_NOT_FOUND 404, FORBIDDEN/NO_COMPANY 403.
    if (status === 409)
      return {
        slug,
        template,
        error: SLUG_TAKEN,
        suggestion: withSuffix(slugify(slug)),
      };
    if (status === 403)
      return {
        slug,
        template,
        error: error.message === "NO_COMPANY" ? NO_COMPANY : FORBIDDEN,
      };
    if (status === 404)
      return { slug, template, error: "Chọn một mẫu thiết kế." };
    if (status !== 400) console.error("Create page failed", error);
    return {
      slug,
      template,
      error: "Không tạo được trang. Kiểm tra slug và thử lại.",
    };
  }

  redirect("/?" + new URLSearchParams({ tab: "bio", slug }));
}

export type SaveDraftResult =
  { revision: number } | { error: string; conflict?: boolean };

/** FE-04: append a draft version if nobody saved since `expectedRevision`. */
export async function saveDraft(
  pageId: string,
  expectedRevision: number,
  site: Site,
): Promise<SaveDraftResult> {
  const config = PageConfigSchema.safeParse(site);
  if (!config.success)
    return {
      error: "Dữ liệu trang không hợp lệ: " + config.error.issues[0].message,
    };

  const supabase = await createSessionClient();
  const { data, error, status } = await supabase.rpc("save_draft", {
    p_page_id: pageId,
    p_expected_revision: expectedRevision,
    p_config: config.data,
  });
  if (error) {
    if (status === 409) {
      return {
        conflict: true,
        error:
          "Trang đã được lưu ở nơi khác. Tải lại trang để lấy bản mới nhất.",
      };
    }
    if (status === 401)
      return { error: "Phiên đăng nhập đã hết. Đăng nhập lại để lưu." };
    if (status === 403)
      return { error: error.message === "NO_COMPANY" ? NO_COMPANY : FORBIDDEN };
    if (status === 404) return { error: "Không tìm thấy trang." };
    console.error("Save draft failed", error);
    return { error: "Không lưu được bản nháp. Vui lòng thử lại." };
  }
  return { revision: Number((data as { revision: number }[])[0].revision) };
}

export type UploadImageResult = { url: string } | { error: string };

/** FE-05/V2-10c: store an image in the caller's company folder and return its public URL (editor+). */
export async function uploadImage(form: FormData): Promise<UploadImageResult> {
  const user = await requireUser();
  const { companyId, role } = await getMembership(user.id);
  if (!atLeast(role, "editor")) return { error: FORBIDDEN };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Chọn một ảnh để tải lên." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Ảnh tối đa 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: "Chỉ nhận ảnh JPG, PNG, WebP hoặc AVIF." };

  const supabase = await createSessionClient();
  // Server-chosen name: no client filename reaches the path (Storage policy also limits it to the company folder).
  const path = `${companyId}/${crypto.randomUUID()}.${type.ext}`;
  const media = supabase.storage.from("linktree-media");
  const { error: uploadError } = await media.upload(path, bytes, {
    contentType: type.mime,
    upsert: false,
  });
  if (uploadError) {
    console.error("Image upload failed", uploadError.message);
    return { error: "Không tải được ảnh. Vui lòng thử lại." };
  }
  const { error: rowError } = await supabase.from("media_assets").insert({
    owner_id: user.id,
    company_id: companyId,
    storage_path: path,
    mime_type: type.mime,
    bytes: bytes.length,
  });
  if (rowError) {
    console.error("Media record failed", rowError.message);
    await media.remove([path]);
    return { error: "Không tải được ảnh. Vui lòng thử lại." };
  }
  return { url: media.getPublicUrl(path).data.publicUrl };
}

export type PageActionResult =
  { error: string; suggestion?: string } | undefined;

/** FE-07: change a page's slug through rename_page(), which also keeps published links working. */
export async function renamePage(
  pageId: string,
  newSlug: string,
): Promise<PageActionResult> {
  const slug = String(newSlug).trim().toLowerCase();
  if (!isValidGlobalSlug(slug)) return { error: SLUG_HINT };
  if (!PAGE_ID.test(String(pageId))) return { error: "Không tìm thấy trang." };

  await requireUser();
  const supabase = await createSessionClient();
  const { error, status } = await supabase.rpc("rename_page", {
    p_page_id: pageId,
    p_new_slug: slug,
  });
  if (error) {
    if (status === 409)
      return { error: SLUG_TAKEN, suggestion: withSuffix(slugify(slug)) };
    if (status === 404) return { error: "Không tìm thấy trang." };
    if (status === 403)
      return { error: error.message === "NO_COMPANY" ? NO_COMPANY : FORBIDDEN };
    if (status !== 400) console.error("Rename page failed", error);
    return { error: "Không đổi được slug. Vui lòng thử lại." };
  }
  // The page's entry covers the old address (now a redirect); the new path may have cached a 404.
  updateTag(pageTag(pageId));
  updateTag(pathTag("/" + slug));
  redirect("/?" + new URLSearchParams({ tab: "slug", slug }));
}

/** FE-07: delete one of the company's pages through delete_page() (admin+); versions and redirects go with it. */
export async function deletePage(pageId: string): Promise<PageActionResult> {
  if (!PAGE_ID.test(String(pageId))) return { error: "Không tìm thấy trang." };
  await requireUser();
  const supabase = await createSessionClient();
  const { error, status } = await supabase.rpc("delete_page", {
    p_page_id: pageId,
  });
  if (error) {
    if (status === 404) return { error: "Không tìm thấy trang." };
    if (status === 403)
      return { error: error.message === "NO_COMPANY" ? NO_COMPANY : FORBIDDEN };
    console.error("Delete page failed", error);
    return { error: "Không xóa được trang. Vui lòng thử lại." };
  }
  updateTag(pageTag(pageId));
  redirect("/");
}

export type PublishResult =
  { revision: number } | { error: string; conflict?: boolean };

/** PUB-01: make the reviewed draft revision live, then refresh the public page's cache. */
export async function publishPage(
  pageId: string,
  expectedRevision: number,
): Promise<PublishResult> {
  if (!PAGE_ID.test(String(pageId)) || !Number.isInteger(expectedRevision))
    return { error: "Không tìm thấy trang." };
  await requireUser();
  const supabase = await createSessionClient();
  const { data, error, status } = await supabase
    .rpc("publish_page", {
      p_page_id: pageId,
      p_expected_revision: expectedRevision,
    })
    .single<{ revision: number; slug: string }>();
  if (error) {
    if (status === 409)
      return {
        conflict: true,
        error:
          "Trang đã được lưu ở nơi khác. Tải lại trang trước khi xuất bản.",
      };
    if (status === 404) return { error: "Không tìm thấy trang." };
    if (status === 403)
      return { error: error.message === "NO_COMPANY" ? NO_COMPANY : FORBIDDEN };
    console.error("Publish failed", error);
    return { error: "Không xuất bản được. Vui lòng thử lại." };
  }
  updateTag(pageTag(pageId));
  updateTag(pathTag("/" + data.slug));
  return { revision: Number(data.revision) };
}

const SLUG_STATUSES = ["available", "invalid", "reserved", "taken"] as const;
export type SlugStatus = (typeof SLUG_STATUSES)[number];
export type SlugCheck =
  { status: SlugStatus; suggestion?: string } | { error: string };

// Debounced typing in two forms stays well below this; it only stops scripted slug enumeration.
const allowSlugCheck = createRateLimiter(30, 60_000);

/** V2-13b/c: whether a slug is free system-wide, with a suggestion when it is taken or reserved. */
export async function checkSlug(slug: string): Promise<SlugCheck> {
  const value = String(slug).trim().toLowerCase();
  const user = await requireUser();
  if (!allowSlugCheck(user.id))
    return { error: "Kiểm tra quá nhiều lần. Đợi một phút rồi thử lại." };
  // Same pattern as slug_available(); skips the database for obviously bad input.
  if (!GLOBAL_SLUG.test(value)) return { status: "invalid" };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("slug_available", {
    p_slug: value,
  });
  const status = SLUG_STATUSES.find((s) => s === data);
  if (error || !status) {
    if (error?.message === "NO_COMPANY") return { error: NO_COMPANY };
    console.error("Slug check failed", error);
    return { error: "Không kiểm tra được slug. Vui lòng thử lại." };
  }
  return status === "taken" || status === "reserved"
    ? { status, suggestion: withSuffix(slugify(value)) }
    : { status };
}
