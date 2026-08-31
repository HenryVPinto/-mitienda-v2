import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Portal Emprendedor — MiTienda",
  robots: { index: false, follow: false },
}

export default function VendorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
