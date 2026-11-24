"use client";

import { useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { Site } from "@/lib/schemas/site";
import { BioPage } from "@/lib/renderer/BioPage";
import { BrowserFrame, PhoneFrame } from "@/components/dashboard/device-frame";
import { Button } from "@/components/ui/button";

export function DevicePicker({
  desktop,
  onChange,
}: {
  desktop: boolean;
  onChange: (value: boolean) => void;
}) {
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
      <PhoneFrame className="max-w-none origin-top-left scale-[.76]">
        {children}
      </PhoneFrame>
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
  const content = site ? (
    <BioPage site={site} />
  ) : (
    <p
      role="status"
      className="m-7 rounded-md bg-card p-4 text-sm text-foreground"
    >
      Không tải được bản xem trước.
    </p>
  );
  if (desktop === undefined) return content;
  return (
    <PreviewDevice
      desktop={desktop}
      address={new URL(landingUrl).host + "/" + slug}
      compact={compact}
    >
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
    <section
      aria-label="Xem trước trang bio"
      className="grid min-w-0 justify-items-center gap-4"
    >
      <DevicePicker desktop={desktop} onChange={setDesktop} />
      <div className="w-full">{content}</div>
    </section>
  );
}
