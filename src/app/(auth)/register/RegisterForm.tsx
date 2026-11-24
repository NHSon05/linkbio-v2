"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckEmailNotice } from "@/components/CheckEmailNotice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, type RegisterState } from "./actions";

export default function RegisterForm({ minPasswordLength }: { minPasswordLength: number }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, {});

  if (state.submitted) {
    return (
      <div className="flex flex-col gap-4">
        <CheckEmailNotice message="Nếu có thể đăng ký với địa chỉ này, bạn sẽ nhận được email xác nhận." />
        <Button asChild variant="outline" size="lg">
          <Link href="/register/resend">Gửi lại email xác nhận</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          aria-invalid={state.field === "email" || undefined}
          aria-describedby={state.field === "email" ? "register-error" : undefined}
          maxLength={255}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={state.field === "password" || undefined}
          aria-describedby={state.field === "password" ? "register-error" : "password-hint"}
          minLength={minPasswordLength}
          required
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          Dùng ít nhất {minPasswordLength} ký tự.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirmation">Xác nhận mật khẩu</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          aria-invalid={state.field === "confirmation" || undefined}
          aria-describedby={state.field === "confirmation" ? "register-error" : undefined}
          required
        />
      </div>
      {state.error && (
        <Alert id="register-error" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang đăng ký…" : "Đăng ký"}
      </Button>
    </form>
  );
}
