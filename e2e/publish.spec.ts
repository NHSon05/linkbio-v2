import { expect, test } from "@playwright/test";
import {
  createUser,
  expectPublicHeading,
  fetchOnce,
  profileName,
  publish,
  save,
  signUp,
  signUpAndCreatePage,
  slugStatus,
  createPage,
  uid,
  visit,
  visitAndTrack,
} from "./helpers";

// QA-01 / V2-15b: login → onboarding → create (suggested slug) → edit → save → publish at /{slug}.
test("owner creates, saves and publishes a page at /{slug}", async ({
  browser,
}) => {
  const son = await createUser("son");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUp(page, son);
  // The create form is pre-filled with a free slug suggested from the username.
  await expect(page.getByLabel("Slug", { exact: true })).toHaveValue(
    son.username,
  );
  const slug = await createPage(page);
  const path = `/${slug}`;

  await expect(
    page.getByText("Chào mừng bạn ghé trang của mình").first(),
  ).toBeVisible(); // starter content
  await profileName(page).fill("Son Review");
  await save(page);
  await page.reload();
  await expect(profileName(page)).toHaveValue("Son Review");

  // Not published yet: visitors get the not-found page.
  const anon = await visit(browser, path);
  expect(anon.response?.status()).toBe(404);
  await expect(
    anon.visitor.getByText("This page could not be found."),
  ).toBeVisible();
  await anon.close();

  await publish(page);
  await expect(page.getByText("Đã xuất bản", { exact: true })).toBeVisible();
  await expectPublicHeading(browser, path, "Son Review");

  // A saved but unpublished edit stays private until the next publish.
  await profileName(page).fill("Son Review v2");
  await save(page);
  await expectPublicHeading(browser, path, "Son Review");
  await publish(page);
  await expectPublicHeading(browser, path, "Son Review v2");

  // AN-01/AN-02: a regular visit is recorded and shows up as a view on the Home tab.
  expect(await visitAndTrack(browser, path)).toBe(202);
  await expect
    .poll(
      async () => {
        await page.goto(`/?tab=home&slug=${slug}`);
        return Number(
          await page
            .locator('[data-slot="card"]')
            .filter({ hasText: "Lượt xem" })
            .locator("strong")
            .first()
            .innerText(),
        );
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);

  await ctx.close();
});

// V2-13a/b: slugs are unique system-wide; a taken slug offers a free suggestion.
test("second user typing a taken slug applies the suggestion", async ({
  browser,
}) => {
  const son = await createUser("son");
  const tien = await createUser("tien");
  const taken = `tech-${uid()}`;

  const sonCtx = await browser.newContext();
  const sonPage = await sonCtx.newPage();
  await signUpAndCreatePage(sonPage, son, taken);
  await profileName(sonPage).fill("Son Page");
  await publish(sonPage);

  const tienCtx = await browser.newContext();
  const tienPage = await tienCtx.newPage();
  await signUp(tienPage, tien);
  const field = tienPage.getByLabel("Slug", { exact: true });
  await field.fill(taken);
  await expect(slugStatus(tienPage)).toContainText("Slug này đã được dùng.");
  await expect(slugStatus(tienPage)).toContainText("Gợi ý:");
  await expect(
    tienPage.getByRole("button", { name: "Tạo trang", exact: true }),
  ).toBeDisabled();

  const apply = slugStatus(tienPage).getByRole("button", { name: /^Dùng / });
  const suggestion = (await apply.innerText()).replace(/^Dùng\s+/, "").trim();
  expect(suggestion).toMatch(/^[a-z0-9][a-z0-9-]{2,29}$/);
  expect(suggestion).not.toBe(taken);
  await apply.click();
  await expect(field).toHaveValue(suggestion);
  expect(await createPage(tienPage)).toBe(suggestion);
  // "Xuất bản" saves unsaved edits first.
  await profileName(tienPage).fill("Tien Page");
  await publish(tienPage);

  await expectPublicHeading(browser, `/${taken}`, "Son Page");
  await expectPublicHeading(browser, `/${suggestion}`, "Tien Page");

  await sonCtx.close();
  await tienCtx.close();
});

// V2-14c: unknown public-shaped paths answer 404, with one or two segments.
test("unknown public paths answer 404", async ({ browser, request }) => {
  for (const path of ["/zz-nope-e2e", "/nobody-e2e/missing"]) {
    expect((await fetchOnce(request, path)).status(), path).toBe(404);
    const { visitor, response, close } = await visit(browser, path);
    expect(response?.status(), path).toBe(404);
    await expect(
      visitor.getByText("This page could not be found."),
    ).toBeVisible();
    await close();
  }
});
