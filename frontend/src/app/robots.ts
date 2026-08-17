import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/account", "/admin", "/api/"],
    },
    sitemap: "https://mitienda.com.gt/sitemap.xml",
  }
}
