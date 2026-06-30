import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"
import { CreateVendorInput } from "../../../modules/vendor/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const [vendors, count] = await vendorService.listAndCountMtVendors(
    {},
    {
      skip: Number(req.query.offset) || 0,
      take: Number(req.query.limit) || 50,
    }
  )
  res.json({ vendors, count })
}

export const POST = async (
  req: MedusaRequest<CreateVendorInput>,
  res: MedusaResponse
) => {
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const vendor = await vendorService.createMtVendors(req.body)
  res.status(201).json({ vendor })
}
