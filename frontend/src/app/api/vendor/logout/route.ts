import { NextResponse } from "next/server"

const VENDOR_COOKIE = "mt_vendor_token"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(VENDOR_COOKIE)
  return response
}
