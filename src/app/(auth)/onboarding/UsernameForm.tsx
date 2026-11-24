"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimUsername, type UsernameState } from "./actions";

export default function UsernameForm({ host }: { host: string }) {
  const [state, action, pending] = useActionState<UsernameState, FormData>(
    claimUsername,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="username">Tên người dùng</Label>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-sm text-muted-foreground">
            {host}/
          </span>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.username}
            aria-invalid={!!state.error || undefined}
            aria-describedby={state.error ? "username-error" : "username-hint"}
            minLength={3}
            maxLength={30}
            required
          />
        </div>
        <p id="username-hint" className="text-xs text-muted-foreground">
          3–30 ký tự: chữ thường, số hoặc dấu gạch ngang. Không đổi được sau khi
          lưu.
        </p>
      </div>
      {state.error && (
        <Alert id="username-error" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang lưu…" : "Tiếp tục"}
      </Button>
    </form>
  );
}
