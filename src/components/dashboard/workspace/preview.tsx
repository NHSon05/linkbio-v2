"use client";

import { useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { themeOf, type Site } from "@/components/dashboard/mock/schema";
import { templates } from "@/components/dashboard/mock/templates";
import { mockSites } from "@/components/dashboard/mock/data";
import { BrowserFrame, PhoneFrame } from "@/components/dashboard/device-frame";
import { Button } from "@/components/ui/button";

export function DevicePicker({ desktop, onChange }: { desktop: boolean; onChange: (value: boolean) => void }) {
  return (
    <div
      role="group"
      aria-label="Thiết bị xem trước"
      className="flex w-fit shrink-0 gap-1 rounded-full bg-card p-1 shadow-soft"
    >
      {[
        { value: false, label: "Điện thoại", Icon: Smartphone },
        { value: true, label: "Máy tính", Icon: Monitor },
      ].map(({ value, label, Icon }) => (
        <Button
          key={label}
          variant={desktop === value ? "default" : "ghost"}
          size="sm"
          aria-label={label}
          aria-pressed={desktop === value}
          onClick={() => onChange(value)}
        >
          <Icon />
          {label}
        </Button>
      ))}
    </div>
  );
}

function PreviewDevice({
  desktop,
  address,
  compact = false,
  children,
}: {
  desktop: boolean;
  address: string;
  compact?: boolean;
  children: ReactNode;
}) {
  if (desktop)
    return (
      <BrowserFrame viewport={{ width: 1440, height: 900 }} url={address}>
        {children}
      </BrowserFrame>
    );
  return compact ? (
    <div className="mx-auto h-[494px] w-[243px]">
      <PhoneFrame className="max-w-none origin-top-left scale-[.76]">{children}</PhoneFrame>
    </div>
  ) : (
    <PhoneFrame className="mx-auto">{children}</PhoneFrame>
  );
}

export function PreviewScreen({
  site,
  slug,
  landingUrl,
  desktop,
  compact = false,
}: {
  site?: Site;
  slug: string;
  landingUrl: string;
  published?: boolean;
  desktop?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const config = site ?? mockSites.find((s) => s.slug === slug);
  const content = config ? (
    <MockBioPage site={config} />
  ) : (
    <p role="status" className="m-7 rounded-md bg-card p-4 text-sm text-foreground">
      Không tải được bản xem trước.
    </p>
  );
  if (desktop === undefined) return content;
  return (
    <PreviewDevice desktop={desktop} address={new URL(landingUrl).host + "/" + slug} compact={compact}>
      {content}
    </PreviewDevice>
  );
}

export function SitePreview({
  site,
  landingUrl,
  published = false,
  fullPage = false,
}: {
  site: Site;
  landingUrl: string;
  published?: boolean;
  fullPage?: boolean;
}) {
  const [desktop, setDesktop] = useState(false);
  const content = (
    <PreviewScreen
      site={site}
      slug={site.slug}
      landingUrl={landingUrl}
      published={published}
      desktop={fullPage ? undefined : desktop}
      title={published ? "Website đã xuất bản" : "Bản xem trước trang bio"}
    />
  );
  if (fullPage) return <main className="h-dvh w-full">{content}</main>;
  return (
    <section aria-label="Xem trước trang bio" className="grid min-w-0 justify-items-center gap-4">
      <DevicePicker desktop={desktop} onChange={setDesktop} />
      <div className="w-full">{content}</div>
    </section>
  );
}

// shortcut: bản xem trước giản lược (hồ sơ + tiêu đề block); thay bằng renderer thật (src/lib/renderer) khi có.
function MockBioPage({ site }: { site: Site }) {
  const theme = themeOf(site, templates[site.template] ?? templates.classic);
  return (
    <div className="grid min-h-full content-start gap-3 p-6 text-ink" style={{ background: theme.bg, fontFamily: theme.font }}>
      {site.profile.cover && (
        /* eslint-disable-next-line @next/next/no-img-element -- ảnh mẫu */
        <img alt="" src={site.profile.cover} className="h-28 w-full rounded-xl object-cover" />
      )}
      <span className="mx-auto mt-2 size-16 rounded-full" style={{ background: theme.accent }} />
      <h2 className="text-center text-lg font-semibold">{site.profile.title}</h2>
      {site.profile.subtitle && <p className="-mt-2 text-center text-sm opacity-70">{site.profile.subtitle}</p>}
      {site.blocks
        .filter((b) => !b.hidden)
        .map((b) => (
          <span
            key={b.id}
            className="rounded-full bg-white px-4 py-3 text-center text-sm font-medium shadow-soft"
            style={{ borderRadius: Number(theme.radius) || undefined }}
          >
            {b.title || b.text || b.type}
          </span>
        ))}
    </div>
  );
}
