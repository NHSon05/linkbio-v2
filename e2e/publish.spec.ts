import { expect, test } from "@playwright/test";
import {
  createUser,
  profileName,
  publish,
  save,
  signUpAndCreatePage,
  visit,
  visitAndTrack,
} from "./helpers";

// QA-01: login → create → edit → publish; two users with the same slug get separate pages.
test("two users publish the same slug independently", async ({ browser }) => {
  const son = await createUser("son");
  const tien = await createUser("tien");
  const sonPath = `/${son.username}/tech-review`;
  const tienPath = `/${tien.username}/tech-review`;

  // Son: create, edit, save; the draft survives a reload.
  const sonCtx = await browser.newContext();
  const sonPage = await sonCtx.newPage();
  await signUpAndCreatePage(sonPage, son, "tech-review");
  await expect(
    sonPage.getByText("Chào mừng bạn ghé trang của mình").first(),
  ).toBeVisible(); // starter content
  await profileName(sonPage).fill("Son Review");
  await save(sonPage);
  await sonPage.reload();
  await expect(profileName(sonPage)).toHaveValue("Son Review");

  // Not published yet: visitors get the not-found page.
  let anon = await visit(browser, sonPath);
  await expect(
    anon.visitor.getByText("This page could not be found."),
  ).toBeVisible();
  await anon.close();

  // Publish: visitors see it.
  await publish(sonPage);
  await expect(sonPage.getByText("Đã xuất bản", { exact: true })).toBeVisible();
  anon = await visit(browser, sonPath);
  await expect(
    anon.visitor.getByRole("heading", { level: 1, name: "Son Review" }),
  ).toBeVisible();
  await anon.close();

  // A saved but unpublished edit stays private until the next publish.
  await profileName(sonPage).fill("Son Review v2");
  await save(sonPage);
  anon = await visit(browser, sonPath);
  await expect(
    anon.visitor.getByRole("heading", { level: 1, name: "Son Review" }),
  ).toBeVisible();
  await anon.close();
  await publish(sonPage);
  anon = await visit(browser, sonPath);
  await expect(
    anon.visitor.getByRole("heading", { level: 1, name: "Son Review v2" }),
  ).toBeVisible();
  await anon.close();

  // Tien: same slug, own page. "Xuất bản" saves unsaved edits first.
  const tienCtx = await browser.newContext();
  const tienPage = await tienCtx.newPage();
  await signUpAndCreatePage(tienPage, tien, "tech-review");
  await profileName(tienPage).fill("Tien Page");
  await publish(tienPage);

  anon = await visit(browser, tienPath);
  await expect(
    anon.visitor.getByRole("heading", { level: 1, name: "Tien Page" }),
  ).toBeVisible();
  await anon.close();
  anon = await visit(browser, sonPath);
  await expect(
    anon.visitor.getByRole("heading", { level: 1, name: "Son Review v2" }),
  ).toBeVisible();
  await anon.close();

  // AN-01/AN-02: a regular visit is recorded and shows up as a view on Son's Home tab.
  expect(await visitAndTrack(browser, sonPath)).toBe(202);
  await expect
    .poll(
      async () => {
        await sonPage.goto("/?tab=home");
        return Number(
          await sonPage
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

  await sonCtx.close();
  await tienCtx.close();
});

test("unknown public paths show the not-found page", async ({ browser }) => {
  const { visitor, close } = await visit(browser, "/nobody-e2e/missing");
  await expect(
    visitor.getByText("This page could not be found."),
  ).toBeVisible();
  await close();
});
