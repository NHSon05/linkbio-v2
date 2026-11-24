import { z } from "zod";

// Keep in sync with profiles_username_format / profiles_username_reserved
// in supabase/migrations/20261124120000_profiles.sql.
export const RESERVED_USERNAMES = [
  "admin",
  "api",
  "auth",
  "dashboard",
  "forgot-password",
  "help",
  "login",
  "logout",
  "onboarding",
  "register",
  "settings",
  "signup",
  "static",
  "support",
  "templates",
  "www",
];

export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9-]{2,29}$/,
    "Dùng 3–30 ký tự: chữ thường, số hoặc dấu gạch ngang, bắt đầu bằng chữ hoặc số.",
  )
  .refine(
    (name) => !RESERVED_USERNAMES.includes(name),
    "Tên này đã được hệ thống dùng. Chọn tên khác.",
  );
