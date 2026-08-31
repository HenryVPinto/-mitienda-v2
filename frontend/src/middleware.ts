import { NextRequest, NextResponse } from "next/server"

const VENDOR_COOKIE = "mt_vendor_token"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isVendorRoute = pathname.startsWith("/mi-tienda")

  if (isVendorRoute && pathname !== "/mi-tienda/login") {
    const token = req.cookies.get(VENDOR_COOKIE)?.value
    if (!token) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = "/mi-tienda/login"
      return NextResponse.redirect(loginUrl)
    }
  }

  // Si ya tiene sesión y va al login, redirige al dashboard
  if (pathname === "/mi-tienda/login") {
    const token = req.cookies.get(VENDOR_COOKIE)?.value
    if (token) {
      const dashboardUrl = req.nextUrl.clone()
      dashboardUrl.pathname = "/mi-tienda"
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Pasar x-is-vendor-portal como request header para que lo lean los Server Components
  const requestHeaders = new Headers(req.headers)
  if (isVendorRoute) {
    requestHeaders.set("x-is-vendor-portal", "1")
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/mi-tienda", "/mi-tienda/:path*"],
}
