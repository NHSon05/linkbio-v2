"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CheckEmailNotice({ message }: { message: string }) {
  return (
    <Alert role="status">
      <AlertTitle>
        <h2 tabIndex={-1} ref={(heading) => heading?.focus()}>
          Kiểm tra email
        </h2>
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
