"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePage,
  renamePage,
  type PageActionResult,
} from "@/app/(dashboard)/actions";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlugHint, slugBlocked, useSlugCheck } from "./slug-check";

/** FE-07/V2-13c: rename the page's slug (checked as you type) or delete the page. Both reload the dashboard, so unsaved edits must be saved first. */
export function PageSettings({
  pageId,
  slug: current,
  published,
  dirty,
}: {
  pageId: string;
  slug: string;
  published: boolean;
  dirty: boolean;
}) {
  const [slug, setSlug] = useState(current);
  // A 409 from rename_page() (someone took the slug after the check) with its suggestion.
  const [taken, setTaken] = useState<{ slug: string; suggestion: string }>();
  const live = useSlugCheck(slug, current);
  const check =
    taken?.slug === slug
      ? { status: "taken" as const, suggestion: taken.suggestion }
      : live;
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const locked = pending || dirty;

  // On success the actions redirect, so only errors come back here.
  const run = (action: () => Promise<PageActionResult>) =>
    start(async () => {
      const result = await action();
      if (result?.suggestion) setTaken({ slug, suggestion: result.suggestion });
      else if (result) toast.error(result.error);
    });

  return (
    <Panel
      title="Cài đặt trang"
      hint={
        dirty
          ? "Lưu nháp trước khi đổi slug hoặc xóa trang."
          : published
            ? "Đổi slug: địa chỉ cũ sẽ tự chuyển sang địa chỉ mới."
            : "Slug là phần cuối địa chỉ trang của bạn."
      }
    >
      <form
        className="grid gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => renamePage(pageId, slug));
        }}
      >
        <Label htmlFor="page-slug">Slug</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">/</span>
          <Input
            id="page-slug"
            value={slug}
            aria-invalid={slugBlocked(check) || undefined}
            aria-describedby="page-slug-status"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            disabled={locked}
            className="min-w-40 flex-1"
            onChange={(e) => setSlug(e.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={
              locked ||
              slug.trim().toLowerCase() === current ||
              slugBlocked(check)
            }
          >
            Đổi slug
          </Button>
        </div>
        <SlugHint id="page-slug-status" check={check} apply={setSlug} />
      </form>
      <div className="mt-4 border-t pt-4">
        <Button
          type="button"
          variant="destructive"
          disabled={locked}
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
          Xóa trang
        </Button>
      </div>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa trang /{current}?</DialogTitle>
            <DialogDescription>
              Trang, mọi bản nháp và địa chỉ chuyển hướng của nó sẽ bị xóa vĩnh
              viễn. Không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Hủy
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deletePage(pageId))}
            >
              {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
