import "server-only";
import { createSessionClient } from "@/lib/auth";
import { siteFromConfig, type Site } from "@/lib/schemas/site";

/** A page with its current draft, as the dashboard edits it. */
export type PageDraft = {
  id: string;
  revision: number;
  published: boolean;
  site: Site;
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
      pages.map((page) => page.draft_version_id),
    );
  if (versionError)
    throw new Error("Không đọc được bản nháp: " + versionError.message);
  const byId = new Map(
    versions.map((version) => [version.id as string, version]),
  );

  return pages.flatMap((page) => {
    const version = byId.get(page.draft_version_id);
    if (!version) return [];
    return [
      {
        id: page.id,
        revision: Number(version.revision),
        published: page.live_version_id != null,
        site: siteFromConfig(version.config, username, page.slug),
      },
    ];
  });
}
