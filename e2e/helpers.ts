import { createClient } from "@supabase/supabase-js";
import { expect, type Browser, type Page } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

// Refuse to create test users anywhere but a local stack.
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
  throw new Error(
    "E2E tests need NEXT_PUBLIC_SUPABASE_URL to be a local Supabase (supabase start).",
  );

const PASSWORD = "e2e-Password-123";

/** Creates a confirmed user and returns credentials plus a unique username. */
export async function createUser(prefix: string) {
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const id = Math.random().toString(36).slice(2, 8);
  const email = `${prefix}-${id}@e2e.test`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return { email, password: PASSWORD, username: `${prefix}-${id}` };
}

type User = Awaited<ReturnType<typeof createUser>>;

/** Logs in, claims the username and creates a page with the given slug (default Classic template). */
export async function signUpAndCreatePage(
  page: Page,
  user: User,
  slug: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Mật khẩu").fill(user.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Tên người dùng").fill(user.username);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Tạo trang đầu tiên" }),
  ).toBeVisible();
  await page.getByLabel("Slug").fill(slug);
  await page.getByRole("button", { name: "Tạo trang", exact: true }).click();
  await expect(page).toHaveURL(/tab=bio/);
}

export const profileName = (page: Page) =>
  page.getByLabel("Tên", { exact: true });

export async function save(page: Page) {
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.getByText("Đã lưu bản nháp.")).toBeVisible();
}

export async function publish(page: Page) {
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.getByText(/^Đã xuất bản \//)).toBeVisible();
}

/** Opens a public page as an anonymous visitor (fresh browser context, no session). */
export async function visit(browser: Browser, path: string) {
  const context = await browser.newContext();
  const visitor = await context.newPage();
  const response = await visitor.goto(path);
  return { visitor, response, close: () => context.close() };
}

/**
 * Visits like a regular browser so the tracker counts the view (it ignores automated browsers via
 * navigator.webdriver), and waits until the events endpoint accepted it.
 */
export async function visitAndTrack(browser: Browser, path: string) {
  const context = await browser.newContext();
  await context.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "webdriver", {
      get: () => false,
    }),
  );
  const visitor = await context.newPage();
  const accepted = visitor.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/events") && r.request().method() === "POST",
  );
  await visitor.goto(path);
  const response = await accepted;
  await context.close();
  return response.status();
}
