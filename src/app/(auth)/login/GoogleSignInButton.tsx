"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending}>
      {pending ? "Đang kết nối với Google…" : "Đăng nhập với Google"}
    </Button>
  );
}
