import { redirect } from "next/navigation";
import { Suspense } from "react";
import Editor from "@/components/dashboard/editor";
import {
  dashboardOrigin,
  getSupabaseEnv,
  getUsername,
  requireUser,
} from "@/lib/auth";
import { listPageDrafts } from "@/lib/pages";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm">Đang tải…</main>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  if (!getSupabaseEnv()) {
    return (
      <main className="p-8 text-sm">Thêm cấu hình Supabase vào .env.</main>
    );
  }
  const user = await requireUser();
  // ON-01: a username is needed before any page (/{username}/{slug}) can exist.
  const username = await getUsername(user.id);
  if (!username) redirect("/onboarding");
  const pages = await listPageDrafts(user.id, username);
  return (
    // Remount when pages are created, renamed or deleted so local drafts reset.
    <Editor
      key={user.id + pages.map((page) => page.id + page.site.slug).join()}
      email={user.email ?? ""}
      landingUrl={dashboardOrigin()}
      pages={pages}
    />
  );
}
