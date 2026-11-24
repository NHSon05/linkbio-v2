import "server-only";
import { z } from "zod";

// Đồng bộ với auth.minimum_password_length trong supabase/config.toml.
export const MIN_PASSWORD_LENGTH = 8;

export const authEmailAddress = z
  .email({ pattern: z.regexes.html5Email })
  .max(255)
  .refine((email) => email.split("@")[0].split(".").every(Boolean));

export type EmailRequestState = { email?: string; error?: string; submitted?: boolean };

export function readAuthEmail(form: FormData) {
  const email = form.get("email");
  return typeof email === "string" ? email.trim() : "";
}

export function readAuthCredentials(form: FormData) {
  const password = form.get("password");

  return {
    email: readAuthEmail(form),
    password: typeof password === "string" ? password : "",
  };
}
