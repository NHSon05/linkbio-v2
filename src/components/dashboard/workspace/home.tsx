"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, MousePointer2, Percent, ShoppingBag, ChartNoAxesColumn } from "lucide-react";
import { formatPrice, type Site } from "@/lib/schemas/site";
import { catalogFor } from "@/components/dashboard/mock/templates/catalog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/dashboard/segmented";
import { mockTraffic } from "@/components/dashboard/mock/data";
import type { SiteSummary } from "@/lib/schemas/site";
import { CreatePage } from "./create-page";
import { Panel } from "@/components/dashboard/panel";
import { workspaceUrl } from "./navigation";
import { SiteGallery } from "./site-gallery";
import { ProductThumb } from "./products";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const periods = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
];
const dayLabel = (day: string) => day.slice(8) + "/" + day.slice(5, 7);

export function MetricCards({ views, clicks, count }: { views: number | null; clicks: number | null; count: number }) {
  const metrics = [
    { title: "Lượt xem", value: views !== null ? number.format(views) : "—", Icon: Eye },
    { title: "Lượt nhấp", value: clicks !== null ? number.format(clicks) : "—", Icon: MousePointer2 },
    {
      title: "Tỷ lệ nhấp",
      value: clicks !== null && views ? number.format((clicks / views) * 100) + "%" : "—",
      Icon: Percent,
    },
    { title: "Sản phẩm", value: number.format(count), Icon: ShoppingBag },
  ];
  const tones = ["bg-olive text-ink", "bg-ink text-white", "bg-hazel text-ink", "bg-card"];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map(({ title, value, Icon }, i) => (
        <Card key={title} className={"min-h-28 justify-between gap-4 rounded-[24px] p-4 sm:p-5 " + tones[i]}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-medium">{title}</span>
            <Icon size={17} strokeWidth={1.6} />
          </div>
          <strong className="text-[clamp(1.8rem,3vw,2.7rem)] leading-none font-medium tracking-[-.065em] tabular-nums">
            {value}
          </strong>
        </Card>
      ))}
    </div>
  );
}

export function HomeOverview({
  site,
  sites,
  drafts,
  landingUrl,
}: {
  site: Site;
  sites: SiteSummary[];
  drafts: Record<string, Site>;
  landingUrl: string;
}) {
  const rows = mockTraffic(site.slug);
  const error = "";
  const [period, setPeriod] = useState("7");
  const days = rows?.slice(-Number(period)) ?? [];
  const views = days.reduce((n, d) => n + d.views, 0);
  const clicks = days.reduce((n, d) => n + d.clicks, 0);
  const products = catalogFor(site).products;
  const top = Math.max(1, ...days.flatMap((d) => [d.views, d.clicks]));
  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="workspace-title">Tổng quan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hoạt động trên trang <b className="font-medium text-foreground">/{site.slug}</b>
          </p>
        </div>
        <Segmented options={periods} value={period} onValueChange={setPeriod} aria-label="Kỳ thống kê" />
      </div>
      <MetricCards views={rows ? views : null} clicks={rows ? clicks : null} count={products.length} />
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)]">
        <Card className="gap-4 border p-5 shadow-none sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">Lưu lượng truy cập</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {days.length ? dayLabel(days[0].day) + " – " + dayLabel(days[days.length - 1].day) : period + " ngày"}
              </p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <i className="size-2 rounded-full bg-brand" />
                Lượt xem
              </span>
              <span className="flex items-center gap-1">
                <i className="size-2 rounded-full bg-chart-2" />
                Lượt nhấp
              </span>
            </div>
          </div>
          {error ? (
            <p role="alert" className="py-8">
              Chưa tải được thống kê. {error}
            </p>
          ) : !rows ? (
            <p role="status" className="py-8">
              Đang tải thống kê…
            </p>
          ) : (
            <div>
              <div className="relative ml-6 h-40 border-b bg-[repeating-linear-gradient(to_top,transparent_0,transparent_calc(25%-1px),var(--border)_25%)]">
                <span
                  aria-hidden
                  className="absolute top-0 -left-1 -translate-x-full font-mono text-2xs text-muted-foreground"
                >
                  {number.format(top)}
                </span>
                <span
                  aria-hidden
                  className="absolute bottom-0 -left-1 -translate-x-full font-mono text-2xs text-muted-foreground"
                >
                  0
                </span>
                <ul
                  aria-label="Lượt xem và lượt nhấp theo ngày"
                  className="absolute inset-0 flex items-end justify-around gap-px"
                >
                  {days.map((d) => (
                    <li
                      key={d.day}
                      className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
                      title={dayLabel(d.day) + " · " + d.views + " lượt xem · " + d.clicks + " lượt nhấp"}
                    >
                      <span className="sr-only">
                        {dayLabel(d.day)}, {d.views} lượt xem, {d.clicks} lượt nhấp
                      </span>
                      <i
                        className="w-1/3 max-w-5 rounded-t-sm bg-brand"
                        style={{ height: (d.views / top) * 100 + "%" }}
                      />
                      <i
                        className="w-1/3 max-w-5 rounded-t-sm bg-chart-2"
                        style={{ height: (d.clicks / top) * 100 + "%" }}
                      />
                    </li>
                  ))}
                </ul>
                {!views && !clicks && (
                  <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center gap-2 text-center">
                    <span className="rounded-full bg-muted p-2">
                      <ChartNoAxesColumn size={18} />
                    </span>
                    <span className="rounded-full bg-card px-2 text-xs">Chưa có lượt truy cập trong kỳ này</span>
                  </div>
                )}
              </div>
              <div className="mt-2 ml-6 flex justify-between font-mono text-2xs text-muted-foreground">
                {[days[0], days[Math.floor(days.length / 2)], days[days.length - 1]].map((d) => (
                  <span key={d.day}>{dayLabel(d.day)}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card className="gap-3 border p-5 shadow-none sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h2 className="text-xl font-semibold">Sản phẩm của bạn</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={workspaceUrl("products", site.slug)}>
                Quản lý
                <ArrowRight />
              </Link>
            </Button>
          </div>
          {products.length ? (
            <ul className="divide-y">
              {products.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <ProductThumb product={p} landingUrl={landingUrl} />
                  <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                  <span className="text-xs">{formatPrice(p.price, p.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">Chưa có sản phẩm affiliate trên trang này.</p>
          )}
        </Card>
      </div>
      <SiteGallery sites={sites} drafts={drafts} active={site} landingUrl={landingUrl} />
      <Panel title="Tạo trang mới" hint="Mỗi trang có slug riêng: /{username}/{slug}.">
        <CreatePage />
      </Panel>
    </div>
  );
}
