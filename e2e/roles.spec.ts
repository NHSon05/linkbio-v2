import { expect, test } from "@playwright/test";
import {
  admin,
  createUser,
  profileName,
  publish,
  signUp,
  signUpAndCreatePage,
  uid,
} from "./helpers";

// V2-11d: a viewer sees the company's pages but none of the save, publish or management controls.
test("viewer sees the company's page read-only", async ({ browser }) => {
  const owner = await createUser("own");
  const viewer = await createUser("view");
  const slug = `team-${uid()}`;

  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await signUpAndCreatePage(ownerPage, owner, slug);
  await profileName(ownerPage).fill("Team Page");
  await publish(ownerPage);

  const viewerCtx = await browser.newContext();
  const page = await viewerCtx.newPage();
  await signUp(page, viewer);

  // No member-management UI yet (V2-11e): move the viewer into the owner's company directly.
  const db = admin();
  const { data: ownerRow, error } = await db
    .from("company_members")
    .select("company_id")
    .eq("user_id", owner.id)
    .single();
  if (error) throw error;
  const { error: moveError } = await db
    .from("company_members")
    .update({ company_id: ownerRow.company_id, role: "viewer" })
    .eq("user_id", viewer.id);
  if (moveError) throw moveError;

  // Home: the owner's page is listed, but there is no create form.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
  await expect(
    page.getByText(`/${slug}`, { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạo trang", exact: true }),
  ).toHaveCount(0);

  // Bio editor: content is visible but locked, with no save or publish.
  await page.goto(`/?tab=bio&slug=${slug}`);
  await expect(profileName(page)).toHaveValue("Team Page");
  await expect(profileName(page)).toBeDisabled();
  await expect(page.getByText("Bạn chỉ có quyền xem.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lưu nháp", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xuất bản", exact: true }),
  ).toHaveCount(0);

  // Settings: no rename or delete.
  await page.goto(`/?tab=slug&slug=${slug}`);
  await expect(page.getByText("Bạn chỉ có quyền xem.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đổi slug", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xóa trang", exact: true }),
  ).toHaveCount(0);

  await ownerCtx.close();
  await viewerCtx.close();
});
