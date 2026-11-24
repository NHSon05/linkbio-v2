import "server-only";

export const EMAIL_CONFIRM_PATH = "/auth/confirm";
export const EMAIL_VERIFY_PATH = "/auth/confirm/verify";

// Đăng ký và gửi lại dùng PKCE; mã mời của quản trị viên không có tiền tố này.
export function isSignupTokenHash(value: unknown): value is string {
  return typeof value === "string" && /^pkce_[a-f0-9]{56}$/.test(value);
}
