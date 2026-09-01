import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

export async function POST(req: NextRequest) {
  const token = req.cookies.get(VENDOR_COOKIE)?.value
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  // Forward raw multipart body preserving the Content-Type boundary
  const contentType = req.headers.get("content-type") ?? ""
  const body = await req.arrayBuffer()

  const backendRes = await fetch(`${BACKEND}/vendor/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: Buffer.from(body),
    cache: "no-store",
  })

  const data = await backendRes.json()
  return NextResponse.json(data, { status: backendRes.status })
}
