import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import VendorDashboard from "./vendor-dashboard"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

async function getVendor() {
  const cookieStore = await cookies()
  const token = cookieStore.get(VENDOR_COOKIE)?.value
  if (!token) return null

  try {
    const res = await fetch(`${BACKEND}/vendor/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.vendor
  } catch {
    return null
  }
}

export default async function VendorPortalPage() {
  const vendor = await getVendor()
  if (!vendor) redirect("/mi-tienda/login")

  return <VendorDashboard vendor={vendor} />
}
