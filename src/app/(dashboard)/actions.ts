"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient, getUsername, requireUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/media";
import { publishedPageTag } from "@/lib/publishing/published";
import { PageConfigSchema, type Site } from "@/lib/schemas/site";

// Same rule as pages.slug in the database.
const PAGE_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const PAGE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreatePageState = {
  slug?: string;
  template?: string;
  error?: string;
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
  if (!PAGE_SLUG.test(slug)) {
    return {
      slug,
      template,
      error: "Slug dùng chữ thường, số hoặc dấu gạch ngang (tối đa 63 ký tự).",
    };
  }

  const user = await requireUser();
  const supabase = await createSessionClient();
  const { error, status } = await supabase.rpc("create_page", {
    p_template_key: template,
    p_slug: slug,
  });
  if (error) {
    // Codes from create_page(): SLUG_TAKEN 409, INVALID_SLUG 400, TEMPLATE_NOT_FOUND 404, USERNAME_REQUIRED 403.
    if (status === 409)
      return { slug, template, error: "Bạn đã có trang với slug này." };
    if (status === 403) redirect("/onboarding");
    if (status === 404)
      return { slug, template, error: "Chọn một mẫu thiết kế." };
    if (status !== 400) console.error("Create page failed", error);
    return {
      slug,
      template,
      error: "Không tạo được trang. Kiểm tra slug và thử lại.",
    };
  }

  const username = await getUsername(user.id);
  redirect(
    "/?" + new URLSearchParams({ tab: "bio", slug: `${username}/${slug}` }),
  );
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
    console.error("Save draft failed", error);
    return { error: "Không lưu được bản nháp. Vui lòng thử lại." };
  }
  return { revision: Number((data as { revision: number }[])[0].revision) };
}

export type UploadImageResult = { url: string } | { error: string };

/** FE-05: store an image in the caller's Storage folder and return its public URL. */
export async function uploadImage(form: FormData): Promise<UploadImageResult> {
  const user = await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Chọn một ảnh để tải lên." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Ảnh tối đa 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: "Chỉ nhận ảnh JPG, PNG, WebP hoặc AVIF." };

  const supabase = await createSessionClient();
  // Server-chosen name: no client filename reaches the path (Storage policy also limits it to the user's folder).
  const path = `${user.id}/${crypto.randomUUID()}.${type.ext}`;
  const media = supabase.storage.from("media");
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

export type PageActionResult = { error: string } | undefined;

/** FE-07: change a page's slug through rename_page(), which also keeps published links working. */
export async function renamePage(
  pageId: string,
  newSlug: string,
): Promise<PageActionResult> {
  const slug = String(newSlug).trim().toLowerCase();
  if (!PAGE_SLUG.test(slug))
    return {
      error: "Slug dùng chữ thường, số hoặc dấu gạch ngang (tối đa 63 ký tự).",
    };
  if (!PAGE_ID.test(String(pageId))) return { error: "Không tìm thấy trang." };

  const user = await requireUser();
  const supabase = await createSessionClient();
  const { data: before } = await supabase
    .from("pages")
    .select("slug")
    .eq("id", pageId)
    .maybeSingle();
  const { error, status } = await supabase.rpc("rename_page", {
    p_page_id: pageId,
    p_new_slug: slug,
  });
  if (error) {
    if (status === 409) return { error: "Bạn đã có trang với slug này." };
    if (status === 404) return { error: "Không tìm thấy trang." };
    if (status === 403) redirect("/onboarding");
    if (status !== 400) console.error("Rename page failed", error);
    return { error: "Không đổi được slug. Vui lòng thử lại." };
  }
  const username = await getUsername(user.id);
  if (username) {
    // The old address now redirects and the new one shows the page.
    if (before) updateTag(publishedPageTag(username, before.slug));
    updateTag(publishedPageTag(username, slug));
  }
  redirect(
    "/?" + new URLSearchParams({ tab: "slug", slug: `${username}/${slug}` }),
  );
}

/** FE-07: delete one of the caller's pages; versions and redirects go with it. */
export async function deletePage(pageId: string): Promise<PageActionResult> {
  if (!PAGE_ID.test(String(pageId))) return { error: "Không tìm thấy trang." };
  const user = await requireUser();
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("pages")
    .delete()
    .eq("id", pageId)
    .eq("owner_id", user.id)
    .select("slug");
  if (error) {
    console.error("Delete page failed", error);
    return { error: "Không xóa được trang. Vui lòng thử lại." };
  }
  if (!data.length) return { error: "Không tìm thấy trang." };
  const username = await getUsername(user.id);
  if (username) updateTag(publishedPageTag(username, data[0].slug));
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
  const user = await requireUser();
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
    console.error("Publish failed", error);
    return { error: "Không xuất bản được. Vui lòng thử lại." };
  }
  const username = await getUsername(user.id);
  if (username) updateTag(publishedPageTag(username, data.slug));
  return { revision: Number(data.revision) };
}
