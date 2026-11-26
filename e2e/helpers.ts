import { createClient } from "@supabase/supabase-js";
import {
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

// Refuse to create test users anywhere but a local stack.
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
  throw new Error(
    "E2E tests need NEXT_PUBLIC_SUPABASE_URL to be a local Supabase (supabase start).",
  );

const PASSWORD = "e2e-Password-123";

/** Service-role client on the linktree schema, for setup that has no UI yet. Local stack only (guard above). */
export const admin = () =>
  createClient(url, secret, {
    auth: { persistSession: false },
    db: { schema: "linktree" },
  });

/** Random suffix so slugs and usernames stay unique across CI retries. */
export const uid = () => Math.random().toString(36).slice(2, 8);

/** Creates a confirmed user and returns credentials plus a unique username. */
export async function createUser(prefix: string) {
  const id = uid();
  const email = `${prefix}-${id}@e2e.test`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return {
    id: data.user.id,
    email,
    password: PASSWORD,
    username: `${prefix}-${id}`,
  };
}

export type User = Awaited<ReturnType<typeof createUser>>;

/** Logs in and claims the username; ends on the empty dashboard of an owner. */
export async function signUp(page: Page, user: User) {
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
}

export const slugStatus = (page: Page) => page.locator("#new-page-slug-status");

/** Creates a page (default Classic template) with the typed slug, or the pre-filled suggestion when omitted. */
export async function createPage(page: Page, slug?: string) {
  const field = page.getByLabel("Slug", { exact: true });
  if (slug !== undefined) await field.fill(slug);
  await expect(slugStatus(page)).toHaveText("Slug còn trống.");
  const created = await field.inputValue();
  await page.getByRole("button", { name: "Tạo trang", exact: true }).click();
  await expect(page).toHaveURL(/tab=bio/);
  return created;
}

export async function signUpAndCreatePage(
  page: Page,
  user: User,
  slug?: string,
) {
  await signUp(page, user);
  return createPage(page, slug);
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

/** Asserts that an anonymous visitor sees `name` as the page heading at `path`. */
export async function expectPublicHeading(
  browser: Browser,
  path: string,
  name: string,
) {
  const { visitor, response, close } = await visit(browser, path);
  expect(response?.status()).toBe(200);
  await expect(
    visitor.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
  await close();
}

/** The first response for `path` without following redirects. */
export const fetchOnce = (request: APIRequestContext, path: string) =>
  request.get(path, { maxRedirects: 0 });

export async function expectRedirect(
  request: APIRequestContext,
  from: string,
  to: string,
) {
  const response = await fetchOnce(request, from);
  expect(response.status()).toBe(308);
  expect(new URL(response.headers()["location"], "http://x").pathname).toBe(to);
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
