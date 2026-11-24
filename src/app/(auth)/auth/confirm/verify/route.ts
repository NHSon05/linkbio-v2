import { NextResponse, type NextRequest } from "next/server";
import { AUTH_LINK_HEADERS, authRedirect, createSessionClient, dashboardOrigin } from "@/lib/auth";
import { EMAIL_CONFIRM_PATH, isSignupTokenHash } from "@/lib/emailConfirmation";

export async function POST(request: NextRequest) {
  const origin = dashboardOrigin();
  if (request.headers.get("origin") !== origin) {
    return new NextResponse(null, { status: 403, headers: AUTH_LINK_HEADERS });
  }

  let destination = EMAIL_CONFIRM_PATH;
  try {
    const form = await request.formData();
    const [tokenHash, ...extraTokens] = form.getAll("token_hash");
    if (!extraTokens.length && isSignupTokenHash(tokenHash)) {
      const supabase = await createSessionClient();
      // Supabase chấp nhận cả mã khôi phục với loại "email"; chỉ dùng loại dành cho đăng ký.
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
      if (!error && data.session) destination = "/";
    }
  } catch {
    // Giữ thông báo chung cho liên kết lỗi và không ghi mã xác nhận vào nhật ký.
  }

  return authRedirect(destination, 303);
}
