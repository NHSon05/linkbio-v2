"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createPage, type CreatePageState } from "@/app/(dashboard)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlugHint, slugBlocked, useSlugCheck } from "./slug-check";
import { TemplatePicker } from "./template-picker";

/** FE-03/V2-13b: pick a template and slug (pre-filled and checked as you type), then create_page(). */
export function CreatePage({ suggestedSlug }: { suggestedSlug: string }) {
  const [state, action, pending] = useActionState<CreatePageState, FormData>(
    createPage,
    {},
  );
  const [template, setTemplate] = useState(state.template || "classic");
  const [slug, setSlug] = useState(state.slug ?? suggestedSlug);
  const live = useSlugCheck(slug);
  // After a 409 the database's answer wins until the user changes the slug.
  const check =
    state.suggestion && slug === state.slug
      ? { status: "taken" as const, suggestion: state.suggestion }
      : live;
  const error =
    slug === state.slug && !state.suggestion ? state.error : undefined;

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
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-invalid={!!error || slugBlocked(check) || undefined}
            aria-describedby={
              "new-page-slug-status" + (error ? " new-page-error" : "")
            }
            maxLength={30}
            required
          />
          <Button type="submit" disabled={pending || slugBlocked(check)}>
            <Plus />
            {pending ? "Đang tạo…" : "Tạo trang"}
          </Button>
        </div>
        <SlugHint id="new-page-slug-status" check={check} apply={setSlug} />
      </div>
      {error && (
        <Alert id="new-page-error" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
