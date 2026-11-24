import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { EmailRequestForm } from "@/components/EmailRequestForm";
import { Button } from "@/components/ui/button";
import { resendConfirmation } from "./actions";

export const metadata: Metadata = { title: "Gửi lại email xác nhận · bio-link" };

export default function ResendConfirmationPage() {
  return (
    <AuthCard title="Gửi lại email xác nhận" description="Nhập địa chỉ email bạn đã dùng để đăng ký.">
      <EmailRequestForm
        requestAction={resendConfirmation}
        submitLabel="Gửi lại email xác nhận"
        confirmationMessage="Nếu địa chỉ này cần xác nhận, bạn sẽ nhận được email xác nhận."
      />
      <Button asChild variant="link" className="mt-4 px-0">
        <Link href="/login">Về đăng nhập</Link>
      </Button>
    </AuthCard>
  );
}
