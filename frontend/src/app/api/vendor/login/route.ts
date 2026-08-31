import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

export async function POST(req: NextRequest) {
  const body = await req.json()

  const backendRes = await fetch(`${BACKEND}/vendor/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status })
  }

  const response = NextResponse.json({ vendor: data.vendor })

  response.cookies.set(VENDOR_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  })

  return response
}
