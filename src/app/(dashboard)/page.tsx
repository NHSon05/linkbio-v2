import { redirect } from "next/navigation";
import { Suspense } from "react";
import Editor from "@/components/dashboard/editor";
import {
  dashboardOrigin,
  getSupabaseEnv,
  getUsername,
  requireUser,
} from "@/lib/auth";

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
  if (!(await getUsername(user.id))) redirect("/onboarding");
  return (
    <Editor
      key={user.id}
      email={user.email ?? ""}
      landingUrl={dashboardOrigin()}
    />
  );
}
