import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BioPage } from "@/lib/renderer/BioPage";
import { PageTracker } from "@/lib/publishing/PageTracker";
import { getPublishedPage } from "@/lib/publishing/published";

type Params = Promise<{ username: string; slug: string }>;

// PUB-02: public pages render the live version only. The first visit renders and stores the page;
// "Xuất bản", rename and delete refresh it through updateTag().
export default function PublicPage({ params }: { params: Params }) {
  // cacheComponents is on: runtime params must be read inside <Suspense>
  return (
    <Suspense fallback={null}>
      <PublishedContent params={params} />
    </Suspense>
  );
}

async function PublishedContent({ params }: { params: Params }) {
  const { username, slug } = await params;
  const page = await getPublishedPage(username, slug);
  if (!page) notFound();
  if ("redirectTo" in page) redirect(page.redirectTo);
  return (
    <main className="min-h-dvh">
      <BioPage site={page.site} />
      <PageTracker path={`/${username}/${slug}`} />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const page = await getPublishedPage(username, slug);
  if (!page || "redirectTo" in page) return {};
  const { title, subtitle } = page.site.profile;
  return { title, description: subtitle || `@${username}` };
}
