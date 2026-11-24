"use server";

import { createEmailRequestClient } from "@/lib/auth";
import { authEmailAddress, MIN_PASSWORD_LENGTH, readAuthCredentials, type EmailRequestState } from "@/lib/authForm";

export type RegisterState = EmailRequestState & {
  field?: "email" | "password" | "confirmation";
};

const emailPrivacyErrors = new Set(["user_already_exists", "email_exists", "over_email_send_rate_limit"]);

export async function register(_: RegisterState, form: FormData): Promise<RegisterState> {
  const { email, password } = readAuthCredentials(form);
  const confirmation = form.get("confirmation");

  if (!authEmailAddress.safeParse(email).success) {
    return { email, field: "email", error: "Nhập địa chỉ email hợp lệ." };
  }
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    return { email, field: "password", error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` };
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { email, field: "password", error: "Mật khẩu không được vượt quá 72 byte." };
  }
  if (password !== confirmation) {
    return { email, field: "confirmation", error: "Mật khẩu xác nhận không khớp." };
  }

  try {
    const supabase = createEmailRequestClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error || emailPrivacyErrors.has(error.code ?? "")) return { submitted: true };
    if (error.code === "signup_disabled") return { email, error: "Đăng ký tài khoản hiện chưa khả dụng." };
  } catch {
    return { email, error: "Không kết nối được tới Supabase." };
  }

  return { email, error: "Không đăng ký được. Vui lòng thử lại sau." };
}
