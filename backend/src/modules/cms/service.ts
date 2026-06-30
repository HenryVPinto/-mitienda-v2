import { MedusaService } from "@medusajs/framework/utils"
import MtBanner from "./models/banner"
import MtFaqItem from "./models/faq-item"
import MtPage from "./models/page"

class CmsModuleService extends MedusaService({ MtBanner, MtFaqItem, MtPage }) {}

export default CmsModuleService
