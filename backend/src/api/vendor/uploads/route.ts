import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

interface MulterFile { originalname: string; mimetype: string; buffer: Buffer }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const files = (req as any).files as MulterFile[]

  if (!files?.length) {
    return res.status(400).json({ message: "No se recibió ningún archivo" })
  }

  try {
    const { result } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: files.map((f) => ({
          filename: f.originalname,
          mimeType: f.mimetype,
          content: f.buffer.toString("base64"),
          access: "public",
        })),
      },
    })

    return res.json({ files: result })
  } catch (err: any) {
    return res.status(500).json({ message: err.message ?? "Error al subir archivo" })
  }
}
