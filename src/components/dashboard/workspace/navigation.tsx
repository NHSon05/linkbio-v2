"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronsUpDown,
  Globe2,
  Home,
  LayoutTemplate,
  Link2,
  LogOut,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SiteSummary } from "@/components/dashboard/mock/data";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/app/(auth)/login/actions";

export const sections = [
  { id: "home", title: "Trang chủ", icon: Home, keywords: "home thống kê lượt xem lượt nhấp" },
  { id: "bio", title: "Link in bio", icon: Link2, keywords: "liên kết mạng xã hội hồ sơ" },
  { id: "slug", title: "Slug", icon: LayoutTemplate, keywords: "template mẫu giao diện thiết kế" },
  { id: "website", title: "Website", icon: Globe2, keywords: "xem trang công khai" },
  {
    id: "products",
    title: "Sản phẩm affiliate",
    icon: ShoppingBag,
    keywords: "my affiliate products sản phẩm của tôi",
  },
] as const;
export type Section = (typeof sections)[number]["id"];

export function workspaceUrl(view: Section, slug?: string) {
  const params = new URLSearchParams();
  if (view !== "home") params.set("tab", view);
  if (slug) params.set("slug", slug);
  return params.size ? "/?" + params : "/";
}

type Props = {
  email: string;
  sites: SiteSummary[];
  slug: string;
  view: Section;
  saving: boolean;
  chooseSite: (slug: string) => boolean;
  children: ReactNode;
};

export function WorkspaceShell(props: Props) {
  return (
    <TooltipProvider>
      <SidebarProvider className="[--sidebar-width:14.5rem]!">
        <ShellContents {...props} />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function ShellContents({ email, sites, slug, view, saving, chooseSite, children }: Props) {
  const visible = sections;
  const { setOpenMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const showSearch = () => {
    setQuery("");
    setOpen(true);
  };
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showSearch();
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const normalize = (s: string) =>
    s
      .toLocaleLowerCase("vi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("đ", "d");
  const term = normalize(query.trim());
  const matches = visible.filter((section) => normalize(section.title + " " + section.keywords).includes(term));
  const siteMatches = sites.filter((site) => normalize(site.title + " " + site.slug).includes(term));
  const current = sites.find((site) => site.slug === slug);
  return (
    <>
      <Sidebar>
        <SidebarHeader className="px-6 pt-8 pb-9">
          <Link
            href={workspaceUrl("home", slug)}
            prefetch={false}
            onNavigate={(event) => {
              event.preventDefault();
              window.history.pushState(null, "", workspaceUrl("home", slug));
            }}
            className="flex w-fit items-center gap-2.5 text-[26px] leading-none font-bold tracking-[-.065em]"
          >
            <BrandMark />
            linkbio
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <nav aria-label="Điều hướng chính">
            <SidebarMenu className="gap-1.5">
              {visible.map(({ id, title, icon: Icon }) => (
                <SidebarMenuItem key={id} className={id === "products" ? "mt-3 border-t pt-4" : ""}>
                  <SidebarMenuButton
                    asChild
                    isActive={view === id}
                    className="h-11 gap-3 rounded-md px-4 text-base data-active:bg-olive data-active:text-ink [&_svg]:size-[18px]"
                  >
                    <Link
                      href={workspaceUrl(id, slug)}
                      prefetch={false}
                      onNavigate={(event) => {
                        event.preventDefault();
                        window.history.pushState(null, "", workspaceUrl(id, slug));
                      }}
                      aria-current={view === id ? "page" : undefined}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Icon />
                      {title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarContent>
        <SidebarFooter className="gap-3 border-t p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent">
              <UserRound size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium">Tài khoản của bạn</div>
              <div className="truncate text-xs text-muted-foreground" title={email}>
                {email}
              </div>
            </div>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" disabled={saving} className="justify-start">
              <LogOut />
              Đăng xuất
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16.5 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:px-7">
          <SidebarTrigger aria-label="Mở hoặc thu gọn điều hướng" />
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Button
            variant="ghost"
            onClick={showSearch}
            className="h-10 min-w-0 justify-start gap-2 rounded-full bg-muted px-3 text-muted-foreground sm:w-64"
          >
            <Search />
            <span className="sr-only sm:not-sr-only sm:truncate">Tìm kiếm</span>
            <kbd aria-hidden className="ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-2xs sm:block">
              ⌘ K
            </kbd>
          </Button>
          <Badge
              variant="secondary"
              title="Các thay đổi được lưu trong trình duyệt này."
              className="ml-auto shrink-0 rounded-full bg-accent px-2 text-2xs text-foreground"
            >
              Dữ liệu mẫu
            </Badge>
          {current && (
            <Select value={slug} disabled={saving} onValueChange={chooseSite}>
              <SelectTrigger
                aria-label="Chọn slug"
                className={"max-w-[39%] gap-2 rounded-full bg-muted px-3"}
              >
                <span className="size-2 shrink-0 rounded-full bg-brand" />
                <span className="truncate">/{slug}</span>
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.slug} value={site.slug}>
                    {site.title} · /{site.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </header>
        <div className="mx-auto w-full max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">{children}</div>
      </SidebarInset>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tìm kiếm</DialogTitle>
            <DialogDescription>Tìm một mục trong dashboard hoặc trang bio của bạn.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Từ khóa"
            placeholder="Nhập tên trang, slug hoặc chức năng…"
          />
          <div className="max-h-[50vh] overflow-y-auto">
            {matches.map(({ id, title, icon: Icon }) => (
              <Button key={id} variant="ghost" asChild className="w-full justify-start">
                <Link
                  href={workspaceUrl(id, slug)}
                  prefetch={false}
                  onNavigate={(event) => {
                    event.preventDefault();
                    window.history.pushState(null, "", workspaceUrl(id, slug));
                  }}
                  onClick={() => setOpen(false)}
                >
                  <Icon />
                  {title}
                  <ArrowUpRight className="ml-auto" />
                </Link>
              </Button>
            ))}
            {!!siteMatches.length && (
              <h3 className="my-2 border-t px-2 pt-3 text-xs text-muted-foreground">Trang bio</h3>
            )}
            {siteMatches.map((site) => (
              <Button
                key={site.slug}
                disabled={saving}
                variant="ghost"
                className="flex w-full justify-start"
                onClick={() => {
                  if (chooseSite(site.slug)) setOpen(false);
                }}
              >
                <ChevronsUpDown />
                <span className="truncate">
                  {site.title} · /{site.slug}
                </span>
              </Button>
            ))}
            {!matches.length && !siteMatches.length && <p className="p-3 text-sm">Không tìm thấy kết quả.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
