import { expect, test } from "@playwright/test";
import {
  admin,
  createUser,
  expectPublicHeading,
  expectRedirect,
  profileName,
  publish,
  signUpAndCreatePage,
  uid,
  type User,
} from "./helpers";
import type { Browser, Page } from "@playwright/test";

async function publishedPage(browser: Browser, user: User, slug: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUpAndCreatePage(page, user, slug);
  await profileName(page).fill("Redirect Page");
  await publish(page);
  return { ctx, page };
}

async function rename(page: Page, from: string, to: string) {
  await page.goto(`/?tab=slug&slug=${from}`);
  const field = page.getByLabel("Slug", { exact: true });
  await field.fill(to);
  await expect(page.locator("#page-slug-status")).toHaveText("Slug còn trống.");
  await page.getByRole("button", { name: "Đổi slug", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`slug=${to}`));
}

// V2-13c / V2-14c: after renaming a published page, /{old} answers 308 to /{new}.
test("renamed published page redirects the old slug", async ({
  browser,
  request,
}) => {
  const user = await createUser("ren");
  const from = `old-${uid()}`;
  const to = `new-${uid()}`;
  const { ctx, page } = await publishedPage(browser, user, from);

  await rename(page, from, to);
  await expectRedirect(request, `/${from}`, `/${to}`);
  await expectPublicHeading(browser, `/${to}`, "Redirect Page");
  await ctx.close();
});

// Same flow, but /{old} was visited before the rename (the normal case for a live page).
test("renamed page redirects even after the old slug was visited", async ({
  browser,
  request,
}) => {
  const user = await createUser("rev");
  const from = `old-${uid()}`;
  const to = `new-${uid()}`;
  const { ctx, page } = await publishedPage(browser, user, from);
  await expectPublicHeading(browser, `/${from}`, "Redirect Page");

  await rename(page, from, to);
  await expectRedirect(request, `/${from}`, `/${to}`);
  await expectPublicHeading(browser, `/${to}`, "Redirect Page");
  await ctx.close();
});

// V2-12b: a legacy /{username}/{slug} address (backfilled by the migration) answers 308 to /{slug}.
test("legacy /{username}/{slug} redirects to /{slug}", async ({
  browser,
  request,
}) => {
  const user = await createUser("leg");
  const slug = `legacy-${uid()}`;
  const { ctx } = await publishedPage(browser, user, slug);

  const db = admin();
  const { data: row, error } = await db
    .from("pages")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const { error: insertError } = await db.from("url_redirects").insert({
    page_id: row.id,
    old_path: `/${user.username}/${slug}`,
    new_path: `/${slug}`,
  });
  if (insertError) throw insertError;

  await expectRedirect(request, `/${user.username}/${slug}`, `/${slug}`);
  await expectPublicHeading(
    browser,
    `/${user.username}/${slug}`,
    "Redirect Page",
  );
  await ctx.close();
});
