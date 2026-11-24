"use server";

import { createEmailRequestClient } from "@/lib/auth";
import { authEmailAddress, readAuthEmail, type EmailRequestState } from "@/lib/authForm";

export async function resendConfirmation(_: EmailRequestState, form: FormData): Promise<EmailRequestState> {
  const email = readAuthEmail(form);
  if (!authEmailAddress.safeParse(email).success) return { email, error: "Nhập địa chỉ email hợp lệ." };

  try {
    const supabase = createEmailRequestClient();
    await supabase.auth.resend({ type: "signup", email });
  } catch {
    // Giữ cùng một phản hồi công khai cho mọi địa chỉ hợp lệ.
  }
  return { submitted: true };
}
