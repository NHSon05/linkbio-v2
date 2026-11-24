import { Suspense } from "react";
import Editor from "@/components/dashboard/editor";
import { dashboardOrigin, getSupabaseEnv, requireUser } from "@/lib/auth";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-sm">Đang tải…</main>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  if (!getSupabaseEnv()) {
    return <main className="p-8 text-sm">Thêm cấu hình Supabase vào .env.</main>;
  }
  const user = await requireUser();
  return <Editor key={user.id} email={user.email ?? ""} landingUrl={dashboardOrigin()} />;
}
