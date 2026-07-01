import { IApiKeyModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function createPublishableKey({
  container,
}: {
  container: any
}) {
  const apiKeyModule: IApiKeyModuleService = container.resolve(Modules.API_KEY)

  const existing = await apiKeyModule.listApiKeys({ type: "publishable" })
  if (existing.length > 0) {
    console.log("Publishable key ya existe:", existing[0].token)
    return
  }

  const key = await apiKeyModule.createApiKeys({
    title: "Storefront",
    type: "publishable",
    created_by: "system",
  })

  console.log("Publishable key creada:", key.token)
}
