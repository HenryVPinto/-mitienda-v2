import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

export async function GET(req: NextRequest) {
  const token = req.cookies.get(VENDOR_COOKIE)?.value
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  const backendRes = await fetch(`${BACKEND}/vendor/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  const data = await backendRes.json()
  return NextResponse.json(data, { status: backendRes.status })
}
