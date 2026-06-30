import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { storeGet } from "@/lib/medusa"
import type { FaqItem } from "@/lib/types"

async function getFaq(): Promise<FaqItem[]> {
  try {
    const data = await storeGet<{ faq_items: FaqItem[] }>("/store/cms/faq")
    return data.faq_items ?? []
  } catch {
    return []
  }
}

export default async function FaqPage() {
  const items = await getFaq()

  const grouped = items.reduce<Record<string, FaqItem[]>>((acc, item) => {
    const cat = item.category ?? "General"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Preguntas frecuentes</h1>
      <p className="text-gray-500 text-sm mb-8">¿Tienes dudas? Aquí encontrarás las respuestas más comunes.</p>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-400 text-center py-12">No hay preguntas disponibles.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, faqs]) => (
            <div key={category}>
              <h2 className="text-base font-semibold text-primary mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full inline-block" />
                {category}
              </h2>
              <Accordion className="space-y-2">
                {faqs
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((item) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="border border-gray-200 rounded-lg px-4 overflow-hidden"
                    >
                      <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600 pb-3 leading-relaxed">
                        {item.answer.trimStart().startsWith("<") ? (
                          <div
                            className="rich-description"
                            dangerouslySetInnerHTML={{ __html: item.answer }}
                          />
                        ) : (
                          item.answer
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
