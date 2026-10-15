import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forte-arena.edu";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/results`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/announcements`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const events = await prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "CLOSED", "COMPLETED"] } },
      select: { slug: true, updatedAt: true },
    });

    const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
      url: `${baseUrl}/events/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const results = await prisma.event.findMany({
      where: { resultsPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const resultRoutes: MetadataRoute.Sitemap = results.map((result) => ({
      url: `${baseUrl}/results/${result.slug}`,
      lastModified: result.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...eventRoutes, ...resultRoutes];
  } catch {
    return staticRoutes;
  }
}
