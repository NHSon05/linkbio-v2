import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH } from "@/lib/authForm";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = { title: "Đăng ký · bio-link" };

export default function RegisterPage() {
  return (
    <AuthCard title="Đăng ký" description="Tạo tài khoản bio-link bằng email.">
      <RegisterForm minPasswordLength={MIN_PASSWORD_LENGTH} />
      <Button asChild variant="link" className="mt-4 px-0">
        <Link href="/login">Về đăng nhập</Link>
      </Button>
    </AuthCard>
  );
}
