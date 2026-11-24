"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmEmailForm({ action, tokenHash }: { action: string; tokenHash: string }) {
  const [pending, setPending] = useState(false);

  return (
    <form method="post" action={action} onSubmit={() => setPending(true)}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Đang xác nhận…" : "Xác nhận email"}
      </Button>
    </form>
  );
}
