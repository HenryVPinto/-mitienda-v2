import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import VendorSidebar from "../vendor-sidebar"
import ProfileForm from "./profile-form"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

async function getData() {
  const cookieStore = await cookies()
  const token = cookieStore.get(VENDOR_COOKIE)?.value
  if (!token) return null

  try {
    const [meRes, profileRes] = await Promise.all([
      fetch(`${BACKEND}/vendor/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${BACKEND}/vendor/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ])

    if (!meRes.ok) return null
    const { vendor: me } = await meRes.json()
    const { vendor: profile } = profileRes.ok ? await profileRes.json() : { vendor: me }
    return { vendor: me, profile }
  } catch {
    return null
  }
}

export default async function PerfilPage() {
  const data = await getData()
  if (!data) redirect("/mi-tienda/login")

  const { vendor, profile } = data

  return (
    <div className="min-h-screen flex bg-gray-50">
      <VendorSidebar vendor={vendor} />
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi perfil</h1>
          <ProfileForm profile={profile} />
        </div>
      </main>
    </div>
  )
}
