import { Suspense } from "react"

type Params = Promise<{ username: string; slug: string }>

export default function PublicPage({ params }: { params: Params }) {
  // cacheComponents is on: runtime params must be read inside <Suspense>
  return (
    <Suspense fallback={null}>
      <BioPage params={params} />
    </Suspense>
  )
}

async function BioPage({ params }: { params: Params }) {
  const { username, slug } = await params

  // TODO: load the published page for username/slug and render it with lib/renderer
  return (
    <main>
      <h1>
        {username} / {slug}
      </h1>
    </main>
  )
}
