"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Pencil } from "lucide-react";
import type { Site, SiteSummary } from "@/lib/schemas/site";
import { templates } from "@/components/dashboard/mock/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { workspaceUrl } from "./navigation";
import { DevicePicker, PreviewScreen } from "./preview";

export function SiteGallery({
  sites,
  drafts,
  active,
  landingUrl,
}: {
  sites: SiteSummary[];
  drafts: Record<string, Site>;
  active: Site;
  landingUrl: string;
}) {
  const [desktop, setDesktop] = useState(false);
  const [limit, setLimit] = useState(4);
  const ordered = [...sites.filter((s) => s.slug === active.slug), ...sites.filter((s) => s.slug !== active.slug)];
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Các slug <span className="align-middle text-sm font-normal text-muted-foreground">({sites.length})</span>
        </h2>
        <DevicePicker desktop={desktop} onChange={setDesktop} />
      </div>
      <div className={desktop ? "grid gap-5" : "grid gap-5 lg:grid-cols-2 2xl:grid-cols-3"}>
        {ordered.slice(0, limit).map((s) => {
          const selected = s.slug === active.slug;
          const id = selected ? active.template : s.template;
          const tpl = templates[id] ?? templates.classic;
          return (
            <Card key={s.slug} className="gap-5 rounded-[36px] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">/{s.slug}</h3>
                  <p className="truncate text-sm text-muted-foreground">{selected ? active.profile.title : s.title}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.platform && <Badge variant="secondary">{s.platform}</Badge>}
                  <Badge variant="secondary">{tpl.name}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {s.publishedSlug && (
                  <Button asChild className="flex-1">
                    <Link href={workspaceUrl("website", s.slug)}>
                      Mở trang
                      <ArrowUpRight />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="secondary" className="flex-1">
                  <Link href={workspaceUrl("slug", s.slug)}>
                    <Pencil />
                    {s.canEdit ? "Sửa" : "Xem thiết kế"}
                  </Link>
                </Button>
              </div>
              <PreviewScreen
                site={selected ? active : drafts[s.slug]}
                slug={s.slug}
                landingUrl={landingUrl}
                desktop={desktop}
                compact
                title={selected ? "Bản xem trước trang bio" : "Xem trước /" + s.slug}
              />
            </Card>
          );
        })}
      </div>
      {sites.length > limit && (
        <Button variant="outline" className="justify-self-center" onClick={() => setLimit((n) => n + 4)}>
          Xem thêm trang
        </Button>
      )}
    </section>
  );
}
