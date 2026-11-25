"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { publishPage, saveDraft } from "@/app/(dashboard)/actions";
import type { PageDraft } from "@/lib/pages";
import { fillDays, type TrafficDay } from "@/lib/analytics";
import { summaryOf, type Site } from "@/lib/schemas/site";
import { Panel, StatusPill } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/dashboard/workspace/blocks";
import { CreatePage } from "@/components/dashboard/workspace/create-page";
import { Design } from "@/components/dashboard/workspace/design";
import { HomeOverview } from "@/components/dashboard/workspace/home";
import {
  sections,
  WorkspaceShell,
  workspaceUrl,
} from "@/components/dashboard/workspace/navigation";
import { SitePreview } from "@/components/dashboard/workspace/preview";
import {
  ProductManager,
  type UpdateDraft,
} from "@/components/dashboard/workspace/products";
import { PageSettings } from "@/components/dashboard/workspace/page-settings";
import { Profile } from "@/components/dashboard/workspace/profile";
import { SocialLinks } from "@/components/dashboard/workspace/social-links";

// Same window as listPageTraffic() (TRAFFIC_DAYS, server-only module).
const TRAFFIC_WINDOW = 30;

const headings = {
  home: "Tổng quan",
  bio: "Link in bio",
  slug: "Thiết kế theo slug",
  website: "Website",
  products: "Sản phẩm affiliate",
};

const bySlug = <T,>(pages: PageDraft[], pick: (page: PageDraft) => T) =>
  Object.fromEntries(pages.map((page) => [page.site.slug, pick(page)]));

/** Dashboard editor: drafts live in state until "Lưu nháp" calls save_draft() (FE-04). */
export default function Editor({
  email,
  landingUrl,
  pages,
  traffic,
}: {
  email: string;
  landingUrl: string;
  pages: PageDraft[];
  /** Per page id; null when analytics could not be loaded. */
  traffic: Record<string, TrafficDay[]> | null;
}) {
  const params = useSearchParams();
  const view = sections.find((s) => s.id === params.get("tab"))?.id ?? "home";
  const [saved, setSaved] = useState<Record<string, Site>>(() =>
    bySlug(pages, (p) => p.site),
  );
  const [drafts, setDrafts] = useState<Record<string, Site>>(() =>
    bySlug(pages, (p) => p.site),
  );
  const [revisions, setRevisions] = useState<Record<string, number>>(() =>
    bySlug(pages, (p) => p.revision),
  );
  const [live, setLive] = useState<Record<string, PageDraft["live"]>>(() =>
    bySlug(pages, (p) => p.live),
  );
  const [saving, setSaving] = useState(false);
  const meta = bySlug(pages, (p) => p);
  const sites = pages.map((page) =>
    summaryOf(drafts[page.site.slug], !!live[page.site.slug]),
  );
  const slug = drafts[params.get("slug") ?? ""]
    ? params.get("slug")!
    : pages[0]?.site.slug;
  const draft = slug ? drafts[slug] : undefined;
  const dirty = !!slug && JSON.stringify(saved[slug]) !== JSON.stringify(draft);
  const upToDate = !!slug && !dirty && live[slug]?.revision === revisions[slug];
  // Rename/delete remount the editor, which would drop unsaved edits on any page.
  const anyDirty = pages.some(
    ({ site }) =>
      JSON.stringify(saved[site.slug]) !== JSON.stringify(drafts[site.slug]),
  );

  const update: UpdateDraft = (fn) => {
    if (!slug || saving) return;
    setDrafts((prev) => {
      const next = structuredClone(prev[slug]);
      fn(next);
      return { ...prev, [slug]: next };
    });
  };
  /** Saves the current draft; returns its revision, or undefined after showing the error. */
  async function persist(slug: string, draft: Site) {
    const result = await saveDraft(meta[slug].id, revisions[slug], draft);
    if ("error" in result) {
      toast.error(result.error);
      return undefined;
    }
    setRevisions((prev) => ({ ...prev, [slug]: result.revision }));
    setSaved((prev) => ({ ...prev, [slug]: draft }));
    return result.revision;
  }
  async function run(task: (slug: string, draft: Site) => Promise<void>) {
    if (!slug || !draft || saving) return;
    setSaving(true);
    try {
      await task(slug, draft);
    } catch {
      toast.error("Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }
  const save = () =>
    run(async (slug, draft) => {
      if (await persist(slug, draft)) toast.success("Đã lưu bản nháp.");
    });
  // PUB-01: unsaved edits are saved first, so visitors see exactly what the preview shows.
  const publish = () =>
    run(async (slug, draft) => {
      const revision = dirty ? await persist(slug, draft) : revisions[slug];
      if (!revision) return;
      const result = await publishPage(meta[slug].id, revision);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setLive((prev) => ({ ...prev, [slug]: { revision, site: draft } }));
      toast.success("Đã xuất bản /" + slug);
    });

  return (
    <WorkspaceShell
      email={email}
      sites={sites}
      slug={slug ?? ""}
      view={view}
      saving={saving}
      chooseSite={(value) => {
        if (saving) return false;
        window.history.pushState(null, "", workspaceUrl(view, value));
        return true;
      }}
    >
      {!slug || !draft ? (
        <div className="grid max-w-3xl gap-5">
          <h1 className="workspace-title">Tạo trang đầu tiên</h1>
          <Panel
            title="Chọn mẫu và slug"
            hint="Trang sẽ có địa chỉ /{username}/{slug}."
          >
            <CreatePage />
          </Panel>
        </div>
      ) : view === "home" ? (
        <HomeOverview
          key={slug}
          site={draft}
          sites={sites}
          drafts={drafts}
          landingUrl={landingUrl}
          traffic={
            traffic
              ? (traffic[meta[slug].id] ?? fillDays([], TRAFFIC_WINDOW))
              : null
          }
        />
      ) : (
        <div key={slug} className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="workspace-title">{headings[view]}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {draft.profile.title} · /{slug}
              </p>
            </div>
            {view === "website" && live[slug] && (
              <Button asChild>
                <Link href={"/" + slug} target="_blank" rel="noreferrer">
                  Mở trang công khai
                  <ArrowUpRight />
                </Link>
              </Button>
            )}
          </div>
          {view === "website" ? (
            live[slug] ? (
              <SitePreview
                key={"published-" + slug}
                site={live[slug].site}
                landingUrl={landingUrl}
                published
              />
            ) : (
              <Panel
                title="Trang chưa được xuất bản"
                hint={`Bấm "Xuất bản" để trang xuất hiện tại /${slug}.`}
              />
            )
          ) : (
            <>
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,1fr)]">
                {view === "products" ? (
                  <ProductManager
                    site={draft}
                    update={update}
                    locked={saving}
                    landingUrl={landingUrl}
                  />
                ) : (
                  <fieldset
                    disabled={saving}
                    className="grid min-w-0 gap-4"
                    aria-label="Nội dung trang"
                  >
                    {view === "bio" && (
                      <>
                        <SocialLinks
                          site={draft}
                          update={update}
                          locked={saving}
                        />
                        <Profile draft={draft} update={update} />
                        <BlockEditor draft={draft} update={update} />
                      </>
                    )}
                    {view === "slug" && (
                      <>
                        <PageSettings
                          key={slug}
                          pageId={meta[slug!].id}
                          path={slug!}
                          published={!!live[slug!]}
                          dirty={anyDirty}
                        />
                        <Design draft={draft} update={update} locked={saving} />
                      </>
                    )}
                  </fieldset>
                )}
                <div className="min-w-0 xl:sticky xl:top-20">
                  <SitePreview site={draft} landingUrl={landingUrl} />
                </div>
              </div>
              <footer className="sticky bottom-0 z-[5] flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 px-3 py-2 shadow-soft backdrop-blur-sm">
                <StatusPill dirty={!upToDate}>
                  {dirty
                    ? "Có thay đổi chưa lưu"
                    : upToDate
                      ? "Đã xuất bản"
                      : live[slug]
                        ? "Đã lưu · có thay đổi chưa xuất bản"
                        : "Đã lưu · chưa xuất bản"}
                </StatusPill>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {dirty && (
                    <Button
                      variant="ghost"
                      title="Bỏ thay đổi"
                      aria-label="Bỏ thay đổi"
                      size="icon"
                      disabled={saving}
                      onClick={() =>
                        setDrafts((prev) => ({ ...prev, [slug]: saved[slug] }))
                      }
                    >
                      <Undo2 />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={!dirty || saving}
                    onClick={save}
                  >
                    {saving ? "Đang lưu…" : "Lưu nháp"}
                  </Button>
                  <Button disabled={upToDate || saving} onClick={publish}>
                    {saving ? "Đang xử lý…" : "Xuất bản"}
                  </Button>
                </div>
              </footer>
            </>
          )}
        </div>
      )}
    </WorkspaceShell>
  );
}
