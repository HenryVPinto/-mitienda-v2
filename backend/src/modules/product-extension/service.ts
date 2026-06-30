import { MedusaService } from "@medusajs/framework/utils"
import MtProductExtension from "./models/product-extension"

class ProductExtensionModuleService extends MedusaService({
  MtProductExtension,
}) {}

export default ProductExtensionModuleService
