import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import VendorModule from "../modules/vendor"

// isList: true en el producto significa que un vendor puede tener múltiples
// productos (relación uno vendor → muchos productos). Sin esto, Medusa impide
// asignar el mismo vendor a más de un producto.
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  VendorModule.linkable.mtVendor
)
