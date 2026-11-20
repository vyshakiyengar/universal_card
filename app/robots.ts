import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/account", "/admin", "/studio"] },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
