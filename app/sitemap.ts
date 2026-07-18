import type { MetadataRoute } from "next";
import { repairGuides } from "@/lib/repairs";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/upload`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    ...repairGuides.map((g) => ({
      url: `${base}/repairs/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
