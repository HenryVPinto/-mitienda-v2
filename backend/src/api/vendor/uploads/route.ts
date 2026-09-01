import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Pendiente: configurar multer para multipart antes de activar este endpoint.
// El módulo FILE de Medusa v2 usa uploadFiles() pero requiere parseo previo del multipart.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  return res.status(501).json({
    message: "Subida de imágenes no disponible aún. Configura multer en el middleware de esta ruta.",
  })
}
