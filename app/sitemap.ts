import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteOrigin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteOrigin}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteOrigin}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteOrigin}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
