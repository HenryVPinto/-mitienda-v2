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

  // Marcar rutas vendor para que el root layout omita header/footer
  const response = NextResponse.next()
  if (isVendorRoute) {
    response.headers.set("x-is-vendor-portal", "1")
  }
  return response
}

export const config = {
  matcher: ["/mi-tienda/:path*"],
}
