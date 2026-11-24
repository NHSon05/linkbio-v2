"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/auth";
import { UsernameSchema } from "@/lib/schemas/username";

export type UsernameState = { username?: string; error?: string };

export async function claimUsername(
  _: UsernameState,
  form: FormData,
): Promise<UsernameState> {
  const raw = String(form.get("username") ?? "");
  const parsed = UsernameSchema.safeParse(raw);
  if (!parsed.success)
    return { username: raw, error: parsed.error.issues[0].message };
  const username = parsed.data;

  const supabase = await createSessionClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", auth.user.id)
    .select("id");
  if (error) {
    // 23505 unique, 23514 format/reserved check, PT409 already claimed (profiles migration).
    if (error.code === "23505")
      return { username, error: "Tên này đã có người dùng. Chọn tên khác." };
    if (error.code === "23514")
      return {
        username,
        error: "Tên không hợp lệ hoặc đã được hệ thống dùng.",
      };
    if (error.code !== "PT409") {
      console.error("Claim username failed", error);
      return {
        username,
        error: "Không lưu được tên người dùng. Vui lòng thử lại.",
      };
    }
  } else if (!data?.length) {
    return {
      username,
      error: "Không tìm thấy hồ sơ của bạn. Vui lòng đăng nhập lại.",
    };
  }

  redirect("/");
}
