import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Quên mật khẩu · bio-link" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Quên mật khẩu" description="Yêu cầu đặt lại mật khẩu hiện chưa khả dụng.">
      <Button asChild variant="link" className="px-0">
        <Link href="/login">Về đăng nhập</Link>
      </Button>
    </AuthCard>
  );
}
