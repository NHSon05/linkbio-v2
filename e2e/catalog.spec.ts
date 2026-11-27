import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  createUser,
  expectPublicHeading,
  expectRedirect,
  fetchOnce,
  profileName,
  publish,
  save,
  signUpAndCreatePage,
  uid,
  visit,
} from "./helpers";

const TITLE = "Catalog Shop";
const PRODUCT = "MacBook Air M4";
const PRODUCT_URL = "https://example.com/macbook-air-m4";

/** Adds a category, or a subcategory of `parent`, and checks the slug pre-filled from the name. */
async function addCategory(
  page: Page,
  name: string,
  path: string,
  parent?: string,
) {
  if (parent)
    await page
      .getByRole("list", { name: "Danh sách danh mục" })
      .getByRole("button", { name: `Thêm danh mục con vào ${parent}` })
      .click();
  else
    await page
      .getByRole("button", { name: "Thêm danh mục", exact: true })
      .click();
  const dialog = page.getByRole("dialog", {
    name: parent ? "Thêm danh mục con" : "Thêm danh mục",
    exact: true,
  });
  await dialog.getByLabel("Tên danh mục").fill(name);
  await expect(dialog.getByLabel("Slug danh mục")).toHaveValue(
    path.split("/").pop()!,
  );
  await expect(dialog.locator("#category-path")).toHaveText(`Địa chỉ: ${path}`);
  await dialog
    .getByRole("button", { name: "Thêm vào bản nháp", exact: true })
    .click();
  await expect(dialog).toBeHidden();
}

/** Client navigations keep the document, so the address and the view's h1 are checked together. */
async function expectView(page: Page, path: string, heading: string) {
  await expect(page).toHaveURL((url) => url.pathname === path);
  await expect(
    page.getByRole("heading", { level: 1, name: heading, exact: true }),
  ).toBeVisible();
}

// Same as rename() in redirects.spec.ts.
async function rename(page: Page, from: string, to: string) {
  await page.goto(`/?tab=slug&slug=${from}`);
  await page.getByLabel("Slug", { exact: true }).fill(to);
  await expect(page.locator("#page-slug-status")).toHaveText("Slug còn trống.");
  await page.getByRole("button", { name: "Đổi slug", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`slug=${to}`));
}

// V2-30c / V2-31b / V2-31c: categories built in the Products workspace survive save and reload, then serve
// /{slug}/{category}[/{subcategory}] after publish, with breadcrumbs, history, 404s and 308s.
test("catalog categories persist in the editor and serve public routes", async ({
  browser,
  request,
}) => {
  test.slow(); // One flow from sign-up to rename; each step needs the previous one.
  const owner = await createUser("cat");
  const slug = `shop-${uid()}`;
  const root = `/${slug}`;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await test.step("owner builds a category tree and assigns a product", async () => {
    await signUpAndCreatePage(page, owner, slug);
    await profileName(page).fill(TITLE);
    // The sidebar switches views without a reload, so the unsaved title stays in the draft.
    await page
      .getByRole("navigation", { name: "Điều hướng chính" })
      .getByRole("link", { name: "Sản phẩm affiliate" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sản phẩm affiliate" }),
    ).toBeVisible();

    await addCategory(page, "Laptop", `${root}/laptop`);
    await addCategory(page, "MacBook", `${root}/laptop/macbook`, "Laptop");

    await page.getByLabel("Đường dẫn sản phẩm").fill(PRODUCT_URL);
    await page
      .getByRole("button", { name: "Thêm sản phẩm", exact: true })
      .click();
    const add = page.getByRole("dialog", {
      name: "Thêm sản phẩm",
      exact: true,
    });
    await expect(
      add.getByLabel("Liên kết sản phẩm", { exact: true }),
    ).toHaveValue(PRODUCT_URL);
    await add.getByLabel("Tên sản phẩm", { exact: true }).fill(PRODUCT);
    await add
      .getByRole("group", { name: "Danh mục" })
      .getByRole("checkbox", { name: "Laptop / MacBook", exact: true })
      .check();
    await add
      .getByRole("button", { name: "Thêm vào bản nháp", exact: true })
      .click();
    await expect(add).toBeHidden();
    await save(page);
  });

  await test.step("the saved tree and assignment survive a reload", async () => {
    await page.reload();
    const laptop = page
      .getByRole("list", { name: "Danh sách danh mục" })
      .getByRole("listitem", { name: "Laptop", exact: true });
    await expect(
      laptop.getByRole("listitem", { name: "MacBook", exact: true }),
    ).toContainText(`${root}/laptop/macbook · 1 sản phẩm`);

    await page
      .getByRole("listitem", { name: PRODUCT, exact: true })
      .getByRole("button", { name: PRODUCT })
      .click();
    await page
      .getByRole("dialog", { name: PRODUCT, exact: true })
      .getByRole("button", { name: "Sửa sản phẩm", exact: true })
      .click();
    const edit = page.getByRole("dialog", {
      name: "Sửa sản phẩm",
      exact: true,
    });
    const checks = edit.getByRole("group", { name: "Danh mục" });
    await expect(
      checks.getByRole("checkbox", { name: "Laptop / MacBook", exact: true }),
    ).toBeChecked();
    await expect(
      checks.getByRole("checkbox", { name: "Laptop", exact: true }),
    ).not.toBeChecked();
    await edit.getByRole("button", { name: "Hủy", exact: true }).click();
    await expect(edit).toBeHidden();
    await publish(page);
  });

  await test.step("direct links to categories answer 200", async () => {
    for (const path of [`${root}/laptop`, `${root}/laptop/macbook`])
      expect((await fetchOnce(request, path)).status(), path).toBe(200);
    await expectPublicHeading(browser, `${root}/laptop`, "Laptop");
  });

  await test.step("breadcrumbs, links and history move between views", async () => {
    const sub = `${root}/laptop/macbook`;
    const cat = `${root}/laptop`;
    const { visitor, response, close } = await visit(browser, sub);
    expect(response?.status()).toBe(200);
    await expectView(visitor, sub, "MacBook");
    await visitor.reload();
    await expectView(visitor, sub, "MacBook");

    const crumbs = visitor.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link")).toHaveText([
      TITLE,
      "Laptop",
      "MacBook",
    ]);
    await expect(
      crumbs.getByRole("link", { name: "MacBook", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    // Checked, never followed: it leaves the site.
    const card = visitor.getByRole("link", { name: PRODUCT, exact: true });
    await expect(card).toHaveAttribute("href", PRODUCT_URL);
    await expect(card).toHaveAttribute("target", "_blank");
    await expect(card).toHaveAttribute("rel", "noopener noreferrer nofollow");

    await crumbs.getByRole("link", { name: "Laptop", exact: true }).click();
    await expectView(visitor, cat, "Laptop");
    await expect(
      visitor
        .getByRole("navigation", { name: "Danh mục con" })
        .getByRole("link", { name: "MacBook", exact: true }),
    ).toHaveAttribute("href", sub);
    // A category also lists its subcategories' products.
    await expect(
      visitor.getByRole("link", { name: PRODUCT, exact: true }),
    ).toHaveAttribute("href", PRODUCT_URL);

    await crumbs.getByRole("link", { name: TITLE, exact: true }).click();
    await expectView(visitor, root, TITLE);
    const categoryLink = visitor
      .getByRole("navigation", { name: "Danh mục", exact: true })
      .getByRole("link", { name: "Laptop", exact: true });
    await expect(categoryLink).toHaveAttribute("href", cat);

    await visitor.goBack();
    await expectView(visitor, cat, "Laptop");
    await visitor.goBack();
    await expectView(visitor, sub, "MacBook");
    await visitor.goForward();
    await expectView(visitor, cat, "Laptop");
    await visitor.goForward();
    await expectView(visitor, root, TITLE);
    await categoryLink.click();
    await expectView(visitor, cat, "Laptop");
    await close();
  });

  await test.step("unknown or malformed categories answer 404", async () => {
    // "/Laptop": category slugs are lowercase, so the proxy rejects it before the route streams a 200.
    for (const path of [
      `${root}/unknown`,
      `${root}/laptop/unknown`,
      `${root}/Laptop`,
    ]) {
      expect((await fetchOnce(request, path)).status(), path).toBe(404);
      const { visitor, response, close } = await visit(browser, path);
      expect(response?.status(), path).toBe(404);
      await expect(
        visitor.getByText("This page could not be found."),
      ).toBeVisible();
      await close();
    }
  });

  await test.step("old addresses answer 308 and keep the category part", async () => {
    // A backfilled /{username}/{slug} (as in redirects.spec.ts): two segments that are not a category here.
    const db = admin();
    const { data: row, error } = await db
      .from("pages")
      .select("id")
      .eq("slug", slug)
      .single();
    if (error) throw error;
    const legacy = `/${owner.username}/${slug}`;
    const { error: insertError } = await db
      .from("url_redirects")
      .insert({ page_id: row.id, old_path: legacy, new_path: root });
    if (insertError) throw insertError;
    await expectRedirect(request, legacy, root);

    const moved = `moved-${uid()}`;
    await rename(page, slug, moved);
    await expectRedirect(request, `${root}/laptop`, `/${moved}/laptop`);
    await expectRedirect(
      request,
      `${root}/laptop/macbook`,
      `/${moved}/laptop/macbook`,
    );
    // rename_page() points every older address at the new slug: no chain through /{slug}.
    await expectRedirect(request, legacy, `/${moved}`);
    await expectPublicHeading(browser, `/${moved}/laptop/macbook`, "MacBook");
  });

  await ctx.close();
});
