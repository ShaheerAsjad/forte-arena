import type { NextConfig } from "next";

function getRemotePatterns() {
  const patterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
    {
      protocol: "https",
      hostname: "*.supabase.co",
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      const protocol = (parsed.protocol.replace(":", "") as "http" | "https") || "https";
      const hostname = parsed.hostname;
      if (hostname && !patterns.some((p) => p.hostname === hostname)) {
        patterns.push({
          protocol,
          hostname,
          ...(parsed.port ? { port: parsed.port } : {}),
        });
      }
    } catch {
      // Ignore malformed URL
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["pg"],
  images: {
    remotePatterns: getRemotePatterns(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
