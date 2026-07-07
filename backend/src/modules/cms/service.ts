import { MedusaService } from "@medusajs/framework/utils"
import MtBanner from "./models/banner"
import MtFaqItem from "./models/faq-item"
import MtPage from "./models/page"
import MtBankAccount from "./models/bank-account"

class CmsModuleService extends MedusaService({ MtBanner, MtFaqItem, MtPage, MtBankAccount }) {}

export default CmsModuleService
