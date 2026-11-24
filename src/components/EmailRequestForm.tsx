"use client";

import { useActionState } from "react";
import { CheckEmailNotice } from "@/components/CheckEmailNotice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailRequestState } from "@/lib/authForm";

type EmailRequestFormProps = {
  requestAction: (previous: EmailRequestState, form: FormData) => Promise<EmailRequestState>;
  submitLabel: string;
  confirmationMessage: string;
};

export function EmailRequestForm({ requestAction, submitLabel, confirmationMessage }: EmailRequestFormProps) {
  const [state, action, pending] = useActionState(requestAction, {});

  if (state.submitted) return <CheckEmailNotice message={confirmationMessage} />;

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
          aria-invalid={!!state.error || undefined}
          aria-describedby={state.error ? "email-error" : undefined}
          maxLength={255}
          required
        />
      </div>
      {state.error && (
        <Alert id="email-error" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang gửi…" : submitLabel}
      </Button>
    </form>
  );
}
