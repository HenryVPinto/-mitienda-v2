import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const files = (req as any).files ?? []

  if (!files.length) {
    return res.status(400).json({ message: "No se recibieron archivos" })
  }

  const fileModule = req.scope.resolve(Modules.FILE)

  const uploaded = await fileModule.upload(
    files.map((f: any) => ({
      filename: f.originalname,
      mimeType: f.mimetype,
      content: f.buffer,
      access: "public",
    }))
  )

  return res.json({ files: uploaded })
}
