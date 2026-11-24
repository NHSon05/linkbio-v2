import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EMAIL_CONFIRM_PATH, EMAIL_VERIFY_PATH, isSignupTokenHash } from "@/lib/emailConfirmation";
import { ConfirmEmailForm } from "./ConfirmEmailForm";

export const metadata: Metadata = { title: "Xác nhận email · bio-link" };

export default function ConfirmEmailPage({ searchParams }: PageProps<"/auth/confirm">) {
  return (
    <AuthCard title="Xác nhận email" description="Xác nhận địa chỉ email để hoàn tất đăng ký.">
      <Suspense>
        <ConfirmationForm searchParams={searchParams} />
      </Suspense>
      <Button asChild variant="link" className="mt-4 px-0">
        <Link href="/login">Về đăng nhập</Link>
      </Button>
    </AuthCard>
  );
}

async function ConfirmationForm({ searchParams }: Pick<PageProps<"/auth/confirm">, "searchParams">) {
  const { token_hash: tokenHash, type } = await searchParams;
  if (type === "email" && isSignupTokenHash(tokenHash)) {
    return <ConfirmEmailForm action={EMAIL_VERIFY_PATH} tokenHash={tokenHash} />;
  }

  if (tokenHash !== undefined || type !== undefined) redirect(EMAIL_CONFIRM_PATH);

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertDescription>Liên kết xác nhận không hợp lệ hoặc đã hết hạn.</AlertDescription>
      </Alert>
      <Button asChild size="lg">
        <Link href="/register/resend">Gửi lại email xác nhận</Link>
      </Button>
    </div>
  );
}
