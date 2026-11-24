"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionClient,
  dashboardOrigin,
  GOOGLE_ATTEMPT_COOKIE,
  GOOGLE_CALLBACK_PATH,
  googleLoginError,
  safeNext,
} from "@/lib/auth";
import { readAuthCredentials } from "@/lib/authForm";

export type LoginState = { error?: string; email?: string; needsEmailConfirmation?: boolean };

export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const { email, password } = readAuthCredentials(form);
  if (!email || !password) return { error: "Nhập email và mật khẩu.", email };

  try {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const needsEmailConfirmation = error.code === "email_not_confirmed";
      return {
        error: needsEmailConfirmation
          ? "Xác nhận email trước khi đăng nhập."
          : "Không đăng nhập được. Kiểm tra email và mật khẩu.",
        email,
        needsEmailConfirmation,
      };
    }
  } catch (error) {
    console.error("Sign in failed", error);
    return { error: "Không kết nối được tới Supabase.", email };
  }

  redirect(safeNext(form.get("next")));
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNext(form.get("next"));
  let destination = googleLoginError(next);
  const store = await cookies();
  try {
    const callback = new URL(GOOGLE_CALLBACK_PATH, dashboardOrigin());
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.href, skipBrowserRedirect: true },
    });
    if (!error && data.url && data.flowId) {
      // URL của SDK chưa cho biết Supabase có bắt đầu được lượt đăng nhập hay không.
      const authorize = await fetch(data.url, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const location = authorize.headers.get("location");
      await authorize.body?.cancel();
      if (authorize.status === 302 && location) {
        const provider = new URL(location);
        if (provider.protocol === "https:" || provider.protocol === "http:") {
          store.set(GOOGLE_ATTEMPT_COOKIE, JSON.stringify({ next, flowId: data.flowId }), {
            httpOnly: true,
            sameSite: "lax",
            secure: callback.protocol === "https:",
            path: GOOGLE_CALLBACK_PATH,
            maxAge: 600,
          });
          destination = provider.href;
        }
      }
    }
  } catch {
    console.error("Không thể bắt đầu đăng nhập với Google.");
  }
  if (destination.startsWith("/")) {
    store.set(GOOGLE_ATTEMPT_COOKIE, "", { path: GOOGLE_CALLBACK_PATH, maxAge: 0 });
  }
  redirect(destination);
}

export async function signOut() {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Sign out failed", error);
  redirect("/login");
}
