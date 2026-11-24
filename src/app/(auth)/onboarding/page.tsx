import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { dashboardOrigin, getUsername, requireUser } from "@/lib/auth";
import UsernameForm from "./UsernameForm";

export const metadata: Metadata = { title: "Chọn tên người dùng · bio-link" };

export default function OnboardingPage() {
  return (
    <AuthCard
      title="Chọn tên người dùng"
      description="Tên này là phần đầu địa chỉ trang bio của bạn."
    >
      <Suspense>
        <Form />
      </Suspense>
    </AuthCard>
  );
}

async function Form() {
  const user = await requireUser();
  if (await getUsername(user.id)) redirect("/");
  return <UsernameForm host={new URL(dashboardOrigin()).host} />;
}
