import { redirect } from "next/navigation";
import { Suspense } from "react";
import { suggestSlug } from "@/lib/slug";
import Editor from "@/components/dashboard/editor";
import {
  dashboardOrigin,
  getSupabaseEnv,
  getUsername,
  requireUser,
} from "@/lib/auth";
import {
  atLeast,
  getMembership,
  listPageDrafts,
  listPageTraffic,
} from "@/lib/pages";

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
  // ON-01: onboarding (claiming a username) still comes before the dashboard.
  const username = await getUsername(user.id);
  if (!username) redirect("/onboarding");
  const [pages, traffic, { role }] = await Promise.all([
    listPageDrafts(),
    listPageTraffic(),
    getMembership(user.id),
  ]);
  return (
    // Remount when pages are created, renamed or deleted so local drafts reset.
    <Editor
      key={user.id + pages.map((page) => page.id + page.site.slug).join()}
      email={user.email ?? ""}
      landingUrl={dashboardOrigin()}
      pages={pages}
      traffic={traffic}
      // V2-11d: only hides controls; every action and RPC checks the role again.
      can={{ edit: atLeast(role, "editor"), manage: atLeast(role, "admin") }}
      suggestedSlug={suggestSlug(
        String(
          user.user_metadata?.full_name || user.user_metadata?.name || username,
        ),
      )}
    />
  );
}
