"use server";

import { redirect } from "next/navigation";
import { createSessionClient, getUsername, requireUser } from "@/lib/auth";
import { PageConfigSchema, type Site } from "@/lib/schemas/site";

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
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) {
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
