"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createPage, type CreatePageState } from "@/app/(dashboard)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplatePicker } from "./template-picker";

/** FE-03: pick a template and slug, then create_page() and open the new page. */
export function CreatePage() {
  const [state, action, pending] = useActionState<CreatePageState, FormData>(
    createPage,
    {},
  );
  const [template, setTemplate] = useState(state.template || "classic");

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="template" value={template} />
      <TemplatePicker value={template} onChange={setTemplate} />
      <div className="grid gap-1.5">
        <Label htmlFor="new-page-slug">Slug</Label>
        <div className="flex gap-2">
          <Input
            id="new-page-slug"
            name="slug"
            placeholder="tech-review"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.slug}
            aria-invalid={!!state.error || undefined}
            aria-describedby={state.error ? "new-page-error" : undefined}
            maxLength={63}
            required
          />
          <Button type="submit" disabled={pending}>
            <Plus />
            {pending ? "Đang tạo…" : "Tạo trang"}
          </Button>
        </div>
      </div>
      {state.error && (
        <Alert id="new-page-error" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
