"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Link2, Plus, Trash2 } from "lucide-react";
import type { Site } from "@/components/dashboard/mock/schema";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UpdateDraft } from "./products";

const networks = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  twitter: "X",
  zalo: "Zalo",
  spotify: "Spotify",
  website: "Website",
};
export function SocialLinks({ site, update, locked }: { site: Site; update: UpdateDraft; locked: boolean }) {
  const [network, setNetwork] = useState("instagram");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function add(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    try {
      const link = new URL(url.trim());
      if (!["https:", "http:"].includes(link.protocol)) throw new Error();
      update((d) => {
        d.profile.socials.push({ type: network, url: link.href });
      });
      setUrl("");
      setError("");
    } catch {
      setError("Nhập liên kết HTTP hoặc HTTPS hợp lệ.");
    }
  }
  return (
    <Panel title="Liên kết mạng xã hội" hint="Các liên kết xuất hiện dưới tên của bạn trên trang bio.">
      <ul className="divide-y">
        {site.profile.socials.map((s, i) => (
          <li key={i} className="flex min-w-0 items-center gap-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent">
              <Link2 size={16} />
            </span>
            <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-semibold">
                {networks[s.type as keyof typeof networks] ?? s.type}
                <ArrowUpRight size={12} />
              </span>
              <span className="block truncate text-xs text-muted-foreground">{s.url}</span>
            </a>
            {!locked && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={"Xóa liên kết " + s.type}
                onClick={() =>
                  update((d) => {
                    d.profile.socials.splice(i, 1);
                  })
                }
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <form onSubmit={add} className="mt-3 grid gap-2 border-t pt-4">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger aria-label="Mạng xã hội">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(networks).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              className="min-w-0"
              type="url"
              aria-label="Đường dẫn mạng xã hội"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <Button type="submit" variant="outline">
              <Plus />
              Thêm liên kết
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </Panel>
  );
}
