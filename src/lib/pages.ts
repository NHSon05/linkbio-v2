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

/** FE-02: the caller's pages with their latest drafts (RLS also limits rows to the owner). */
export async function listPageDrafts(
  userId: string,
  username: string,
): Promise<PageDraft[]> {
  const supabase = await createSessionClient();
  const { data: pages, error } = await supabase
    .from("pages")
    .select("id, slug, draft_version_id, live_version_id")
    .eq("owner_id", userId)
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
    return [
      {
        id: page.id,
        revision: Number(version.revision),
        site: siteFromConfig(version.config, username, page.slug),
        live: live
          ? {
              revision: Number(live.revision),
              site: siteFromConfig(live.config, username, page.slug),
            }
          : null,
      },
    ];
  });
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
