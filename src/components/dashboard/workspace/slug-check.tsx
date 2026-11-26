"use client";

import { useEffect, useState } from "react";
import { checkSlug, type SlugCheck } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { GLOBAL_SLUG } from "@/lib/slug";

const DEBOUNCE_MS = 400;

const messages = {
  available: "Slug còn trống.",
  invalid: "Slug dài 3–30 ký tự, gồm chữ thường, số hoặc dấu gạch ngang.",
  reserved: "Slug này trùng tên hệ thống.",
  taken: "Slug này đã được dùng.",
};

/**
 * V2-13b/c: debounced checkSlug() for what the user typed. Null while waiting, or when the slug is `own`
 * (the page's current slug, which the database reports as taken).
 */
export function useSlugCheck(slug: string, own?: string): SlugCheck | null {
  const value = slug.trim().toLowerCase();
  const local = !value || value === own || !GLOBAL_SLUG.test(value);
  const [result, setResult] = useState<{ slug: string; check: SlugCheck }>();
  useEffect(() => {
    if (local) return;
    let active = true;
    const timer = setTimeout(async () => {
      const check = await checkSlug(value).catch(() => ({
        error: "Không kết nối được máy chủ. Vui lòng thử lại.",
      }));
      if (active) setResult({ slug: value, check });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value, local]);
  if (!value || value === own) return null;
  if (local) return { status: "invalid" };
  return result?.slug === value ? result.check : null;
}

/** The check result as a live status line, with a button that applies the suggested slug. */
export function SlugHint({
  id,
  check,
  apply,
}: {
  id: string;
  check: SlugCheck | null;
  apply: (slug: string) => void;
}) {
  const ok = check && "status" in check && check.status === "available";
  return (
    <p
      id={id}
      role="status"
      className={
        "min-h-5 text-sm " + (ok ? "text-muted-foreground" : "text-destructive")
      }
    >
      {check && ("error" in check ? check.error : messages[check.status])}
      {check && "suggestion" in check && check.suggestion && (
        <>
          {" Gợi ý: "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => apply(check.suggestion!)}
          >
            Dùng {check.suggestion}
          </Button>
        </>
      )}
    </p>
  );
}

/** Blocks submit until the slug is known to be free (the server checks again). */
export const slugBlocked = (check: SlugCheck | null) =>
  !!check && "status" in check && check.status !== "available";
