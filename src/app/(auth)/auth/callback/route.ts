import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  authRedirect,
  createSessionClient,
  GOOGLE_ATTEMPT_COOKIE,
  GOOGLE_CALLBACK_PATH,
  googleLoginError,
  safeNext,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const [code, ...extraCodes] = searchParams.getAll("code");
  const store = await cookies();
  const pending = store.get(GOOGLE_ATTEMPT_COOKIE)?.value;
  store.set(GOOGLE_ATTEMPT_COOKIE, "", { path: GOOGLE_CALLBACK_PATH, maxAge: 0 });

  let attempt: { flowId?: string; next?: string } | null = null;
  try {
    attempt = pending ? JSON.parse(pending) : null;
  } catch {
    // Cookie lỗi phải bắt đầu lại từ trang đăng nhập.
  }
  const next = safeNext(attempt?.next);
  let destination = googleLoginError(next);
  if (
    typeof attempt?.flowId === "string" &&
    code &&
    !extraCodes.length &&
    !searchParams.has("error") &&
    !searchParams.has("error_code")
  ) {
    try {
      const supabase = await createSessionClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code, { flowId: attempt.flowId });
      if (!error && data.session) destination = next;
    } catch {
      console.error("Không thể hoàn tất đăng nhập với Google.");
    }
  }

  return authRedirect(destination, 307);
}
