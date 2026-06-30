import { MedusaService } from "@medusajs/framework/utils"
import MtVendor from "./models/vendor"

class VendorModuleService extends MedusaService({ MtVendor }) {}

export default VendorModuleService
