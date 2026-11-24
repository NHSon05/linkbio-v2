import { AuthCard } from "@/components/AuthCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNext } from "@/lib/auth";
import { signInWithGoogle } from "./actions";
import { GoogleSignInButton } from "./GoogleSignInButton";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Đăng nhập · bio-link" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard title="Đăng nhập bio-link" description="Đăng nhập bằng email hoặc Google.">
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
      <nav aria-label="Trợ giúp đăng nhập" className="mt-4 flex flex-wrap justify-between gap-x-3">
        <Button asChild variant="link" className="px-0">
          <Link href="/register">Đăng ký</Link>
        </Button>
        <Button asChild variant="link" className="px-0">
          <Link href="/forgot-password">Quên mật khẩu?</Link>
        </Button>
      </nav>
    </AuthCard>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  const destination = safeNext(Array.isArray(next) ? next[0] : next);
  return (
    <>
      <LoginForm next={destination} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        hoặc
        <Separator className="flex-1" />
      </div>
      <form action={signInWithGoogle} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={destination} />
        {error === "google" && (
          <Alert variant="destructive">
            <AlertDescription>Không đăng nhập được với Google. Vui lòng thử lại.</AlertDescription>
          </Alert>
        )}
        <GoogleSignInButton />
      </form>
    </>
  );
}
