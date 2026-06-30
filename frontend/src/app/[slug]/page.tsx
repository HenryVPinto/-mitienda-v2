import { notFound } from "next/navigation"
import { storeGet } from "@/lib/medusa"
import type { CmsPage } from "@/lib/types"

type Props = {
  params: Promise<{ slug: string }>
}

async function getPage(slug: string): Promise<CmsPage | null> {
  try {
    const data = await storeGet<{ page: CmsPage }>(`/store/cms/pages/${slug}`)
    return data.page
  } catch {
    return null
  }
}

export default async function CmsPageRoute({ params }: Props) {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page || !page.is_published) notFound()

  const isHtml = page.content.trimStart().startsWith("<")

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{page.title}</h1>
      {isHtml ? (
        <div
          className="rich-description prose prose-sm prose-gray max-w-none text-gray-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        <div className="prose prose-sm prose-gray max-w-none text-gray-600 leading-relaxed">
          {page.content.split("\n").map((line, i) => (
            <p key={i} className="mb-3">{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}
