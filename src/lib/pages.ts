import "server-only";
import { createSessionClient } from "@/lib/auth";
import { fillDays, type TrafficDay } from "@/lib/analytics";
import { siteFromConfig, type Site } from "@/lib/schemas/site";

/** A page with its current draft, as the dashboard edits it, and the live version visitors see. */
export type PageDraft = {
  id: string;
  revision: number;
  site: Site;
  live: { revision: number; site: Site } | null;
};

/** V2-11a role matrix, low to high (data-model.md). */
const ROLES = ["viewer", "editor", "admin", "owner", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

/** Unknown roles rank below viewer, so they get nothing. */
export const atLeast = (role: string, min: Role) =>
  ROLES.indexOf(role as Role) >= ROLES.indexOf(min);

/** V2-11d: the caller's company and role, read on the server (RLS returns only their own row). */
export async function getMembership(
  userId: string,
): Promise<{ companyId: string; role: Role }> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Không đọc được công ty: " + error.message);
  if (!data) throw new Error("Tài khoản chưa thuộc công ty nào.");
  return { companyId: data.company_id as string, role: data.role as Role };
}

/** FE-02/V2-11d: every page of the caller's company with its latest draft (RLS limits rows to the company). */
export async function listPageDrafts(): Promise<PageDraft[]> {
  const supabase = await createSessionClient();
  const { data: pages, error } = await supabase
    .from("pages")
    .select("id, slug, draft_version_id, live_version_id")
    .order("updated_at", { ascending: false });
  if (error)
    throw new Error("Không đọc được danh sách trang: " + error.message);
  if (!pages.length) return [];

  const { data: versions, error: versionError } = await supabase
    .from("page_versions")
    .select("id, revision, config")
    .in(
      "id",
      pages.flatMap((page) =>
        page.live_version_id
          ? [page.draft_version_id, page.live_version_id]
          : [page.draft_version_id],
      ),
    );
  if (versionError)
    throw new Error("Không đọc được bản nháp: " + versionError.message);
  const byId = new Map(
    versions.map((version) => [version.id as string, version]),
  );

  return pages.flatMap((page) => {
    const version = byId.get(page.draft_version_id);
    if (!version) return [];
    const live = page.live_version_id && byId.get(page.live_version_id);
    const liveSite = live && parseOrNull(live.config, page.slug);
    return [
      {
        id: page.id,
        revision: Number(version.revision),
        // A draft saved past the app's checks (direct RPC call) must not lock the company out of the dashboard.
        site:
          parseOrNull(version.config, page.slug) ??
          liveSite ??
          siteFromConfig(BROKEN_DRAFT, page.slug),
        live:
          live && liveSite
            ? { revision: Number(live.revision), site: liveSite }
            : null,
      },
    ];
  });
}

const BROKEN_DRAFT = {
  schemaVersion: 1,
  template: "classic",
  profile: { title: "Bản nháp lỗi, lưu lại để sửa" },
};

function parseOrNull(config: unknown, slug: string): Site | null {
  try {
    return siteFromConfig(config, slug);
  } catch (err) {
    console.error("Stored page config is invalid", slug, err);
    return null;
  }
}

export const TRAFFIC_DAYS = 30;

/** AN-02: last 30 days of views/clicks per page id; null if they could not be loaded. */
export async function listPageTraffic(): Promise<Record<
  string,
  TrafficDay[]
> | null> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("page_traffic", {
    p_days: TRAFFIC_DAYS,
  });
  if (error) {
    console.error("Traffic query failed", error.message);
    return null;
  }
  const rows = new Map<
    string,
    { day: string; views: number; clicks: number }[]
  >();
  for (const r of data as {
    page_id: string;
    day: string;
    views: number;
    clicks: number;
  }[]) {
    const list = rows.get(r.page_id) ?? [];
    list.push({ day: r.day, views: Number(r.views), clicks: Number(r.clicks) });
    rows.set(r.page_id, list);
  }
  return Object.fromEntries(
    [...rows].map(([id, list]) => [id, fillDays(list, TRAFFIC_DAYS)]),
  );
}
