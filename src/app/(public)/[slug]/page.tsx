import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BioPage } from "@/lib/renderer/BioPage";
import { PageTracker } from "@/lib/publishing/PageTracker";
import { getPublishedPage } from "@/lib/publishing/published";

type Params = Promise<{ slug: string }>;

// PUB-02 / V2-14b: public pages live at /{slug} and render the live version only. The first visit renders and stores the page;
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
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();
  // Old addresses moved for good; the proxy answers 308 first, this covers client navigations.
  if ("redirectTo" in page) permanentRedirect(page.redirectTo);
  return (
    <main className="min-h-dvh">
      <BioPage site={page.site} />
      <PageTracker path={`/${slug}`} />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page || "redirectTo" in page) return {};
  const { title, subtitle } = page.site.profile;
  return { title, description: subtitle || undefined };
}
