import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createPage, createUser, profileName, save, signUp } from "./helpers";

// UI-RESP: every dashboard view at phone, tablet and desktop widths. CI uploads the PNGs (artifact
// "dashboard-screens") for review, and the test records any view that scrolls sideways.
const DIR = "e2e-screens";
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1536, height: 900 },
] as const;
const VIEWS = ["home", "bio", "slug", "website", "products"] as const;

/** Pixels the page is wider than the window (0 when nothing overflows sideways). */
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test("dashboard views at phone, tablet and desktop widths", async ({
  page,
}) => {
  test.slow();
  mkdirSync(DIR, { recursive: true });
  const report: Record<string, number> = {};
  async function shot(name: string) {
    await page.waitForLoadState("networkidle");
    report[name] = await overflow(page);
    await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
  }

  const owner = await createUser("ui");
  await signUp(page, owner);
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await shot(`create-${size.name}`);
  }

  await page.setViewportSize(WIDTHS[2]);
  const slug = await createPage(page);
  await profileName(page).fill("Responsive Shop");
  await page.goto(`/?tab=products&slug=${slug}`);
  await page.getByLabel("Đường dẫn sản phẩm").fill("https://example.com/a");
  await page
    .getByRole("button", { name: "Thêm sản phẩm", exact: true })
    .click();
  const product = page.getByRole("dialog", {
    name: "Thêm sản phẩm",
    exact: true,
  });
  await product
    .getByLabel("Tên sản phẩm", { exact: true })
    .fill("Tai nghe chống ồn");
  await product
    .getByRole("button", { name: "Thêm vào bản nháp", exact: true })
    .click();
  await expect(product).toBeHidden();
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  const category = page.getByRole("dialog", {
    name: "Thêm danh mục",
    exact: true,
  });
  await category.getByLabel("Tên danh mục").fill("Âm thanh");
  await category
    .getByRole("button", { name: "Thêm vào bản nháp", exact: true })
    .click();
  await expect(category).toBeHidden();
  await save(page);

  for (const view of VIEWS)
    for (const size of WIDTHS) {
      await page.setViewportSize(size);
      await page.goto(
        view === "home" ? `/?slug=${slug}` : `/?tab=${view}&slug=${slug}`,
      );
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      await shot(`${view}-${size.name}`);
    }

  // Phone only: the navigation drawer and a dialog.
  await page.setViewportSize(WIDTHS[0]);
  await page.goto(`/?tab=products&slug=${slug}`);
  await page
    .getByRole("button", { name: "Mở hoặc thu gọn điều hướng" })
    .first()
    .click();
  await shot("nav-phone");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await shot("dialog-phone");

  writeFileSync(`${DIR}/overflow.json`, JSON.stringify(report, null, 2));
  const wide = Object.entries(report).filter(([, px]) => px > 0);
  // Baseline run: record only. The refactor turns this into a hard check.
  test
    .info()
    .annotations.push({ type: "overflow", description: JSON.stringify(wide) });
  console.log("horizontal overflow (px):", JSON.stringify(wide));
});
