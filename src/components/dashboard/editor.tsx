"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { Site } from "@/lib/schemas/site";
import { mockSites, summaryOf } from "@/components/dashboard/mock/data";
import { StatusPill } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Design } from "@/components/dashboard/workspace/design";
import { HomeOverview } from "@/components/dashboard/workspace/home";
import { sections, WorkspaceShell, workspaceUrl } from "@/components/dashboard/workspace/navigation";
import { SitePreview } from "@/components/dashboard/workspace/preview";
import { ProductManager, type UpdateDraft } from "@/components/dashboard/workspace/products";
import { Profile } from "@/components/dashboard/workspace/profile";
import { SocialLinks } from "@/components/dashboard/workspace/social-links";

const initial = Object.fromEntries(mockSites.map((site) => [site.slug, site]));
const headings = {
  home: "Tổng quan",
  bio: "Link in bio",
  slug: "Thiết kế theo slug",
  website: "Website",
  products: "Sản phẩm affiliate",
};

/** Dashboard UI chạy trên dữ liệu mẫu: bản nháp chỉ nằm trong state, chưa lưu về server. */
export default function Editor({ email, landingUrl }: { email: string; landingUrl: string }) {
  const params = useSearchParams();
  const view = sections.find((s) => s.id === params.get("tab"))?.id ?? "home";
  const [saved, setSaved] = useState<Record<string, Site>>(initial);
  const [drafts, setDrafts] = useState<Record<string, Site>>(initial);
  const sites = Object.values(drafts).map(summaryOf);
  const slug = drafts[params.get("slug") ?? ""] ? params.get("slug")! : mockSites[0].slug;
  const draft = drafts[slug];
  const dirty = JSON.stringify(saved[slug]) !== JSON.stringify(draft);

  const update: UpdateDraft = (fn) =>
    setDrafts((prev) => {
      const next = structuredClone(prev[slug]);
      fn(next);
      return { ...prev, [slug]: next };
    });
  function save(publish: boolean) {
    setSaved((prev) => ({ ...prev, [slug]: draft }));
    toast.success(publish ? "Đã xuất bản (dữ liệu mẫu)." : "Đã lưu bản nháp (dữ liệu mẫu).");
  }

  return (
    <WorkspaceShell
      email={email}
      sites={sites}
      slug={slug}
      view={view}
      saving={false}
      chooseSite={(value) => {
        window.history.pushState(null, "", workspaceUrl(view, value));
        return true;
      }}
    >
      {view === "home" ? (
        <HomeOverview key={slug} site={draft} sites={sites} landingUrl={landingUrl} />
      ) : (
        <div key={slug} className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="workspace-title">{headings[view]}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {draft.profile.title} · /{slug}
              </p>
            </div>
            {view === "website" && (
              <Button asChild>
                <Link href={"/" + slug} target="_blank" rel="noreferrer">
                  Mở trang công khai
                  <ArrowUpRight />
                </Link>
              </Button>
            )}
          </div>
          {view === "website" ? (
            <SitePreview key={"published-" + slug} site={saved[slug]} landingUrl={landingUrl} published />
          ) : (
            <>
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,1fr)]">
                {view === "products" ? (
                  <ProductManager site={draft} update={update} locked={false} landingUrl={landingUrl} />
                ) : (
                  <fieldset className="grid min-w-0 gap-4" aria-label="Nội dung trang">
                    {view === "bio" && (
                      <>
                        <SocialLinks site={draft} update={update} locked={false} />
                        <Profile draft={draft} update={update} />
                      </>
                    )}
                    {view === "slug" && <Design draft={draft} update={update} locked={false} />}
                  </fieldset>
                )}
                <div className="min-w-0 xl:sticky xl:top-20">
                  <SitePreview site={draft} landingUrl={landingUrl} />
                </div>
              </div>
              <footer className="sticky bottom-0 z-[5] flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 px-3 py-2 shadow-soft backdrop-blur-sm">
                <StatusPill dirty={dirty}>{dirty ? "Có thay đổi chưa lưu" : "Đã lưu"}</StatusPill>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {dirty && (
                    <Button
                      variant="ghost"
                      title="Bỏ thay đổi"
                      aria-label="Bỏ thay đổi"
                      size="icon"
                      onClick={() => setDrafts((prev) => ({ ...prev, [slug]: saved[slug] }))}
                    >
                      <Undo2 />
                    </Button>
                  )}
                  <Button variant="outline" disabled={!dirty} onClick={() => save(false)}>
                    Lưu nháp
                  </Button>
                  <Button onClick={() => save(true)}>Xuất bản</Button>
                </div>
              </footer>
            </>
          )}
        </div>
      )}
    </WorkspaceShell>
  );
}
