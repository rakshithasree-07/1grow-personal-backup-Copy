import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: "https://1Grow.com",
      lastModified: new Date(),
    },
  ];
}
