import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

function getToken(req: NextRequest) {
  return req.cookies.get(VENDOR_COOKIE)?.value
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  const { id } = await params
  const backendRes = await fetch(`${BACKEND}/vendor/products/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  const data = await backendRes.json()
  return NextResponse.json(data, { status: backendRes.status })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const backendRes = await fetch(`${BACKEND}/vendor/products/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await backendRes.json()
  return NextResponse.json(data, { status: backendRes.status })
}
