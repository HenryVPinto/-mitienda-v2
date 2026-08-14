import { MedusaService } from "@medusajs/framework/utils"
import MtBrand from "./models/brand"
import MtBrandCatalog from "./models/brand-catalog"

class BrandModuleService extends MedusaService({ MtBrand, MtBrandCatalog }) {}

export default BrandModuleService
