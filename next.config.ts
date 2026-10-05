import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const latestAndroidApk = "https://github.com/zernanvash/juanderquest-mobile/releases/latest/download/juanderquest-latest.apk";
const localApiPort = process.env.NODE_ENV === "production" ? 4000 : 4100;

const rawDistDir = process.env.NEXT_DIST_DIR?.trim();
const allowedDistDirs = new Set([".next", ".next-presentation"]);
if (rawDistDir && !allowedDistDirs.has(rawDistDir)) {
  throw new Error(`Invalid NEXT_DIST_DIR "${rawDistDir}". Must be one of: ${Array.from(allowedDistDirs).join(", ")}`);
}
const distDir = rawDistDir || undefined;

const apiProxyTarget = process.env.API_PROXY_TARGET?.trim();
if (distDir === ".next-presentation") {
  if (!apiProxyTarget) {
    throw new Error("API_PROXY_TARGET is required when running in presentation mode (.next-presentation).");
  }
  let parsedProxy: URL;
  try {
    parsedProxy = new URL(apiProxyTarget);
  } catch {
    throw new Error(`API_PROXY_TARGET "${apiProxyTarget}" is not a valid URL.`);
  }
  if (parsedProxy.href !== "http://127.0.0.1:4200/") {
    throw new Error("Presentation mode requires API_PROXY_TARGET=http://127.0.0.1:4200.");
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL !== "/api/v1") {
    throw new Error("Presentation mode requires same-origin NEXT_PUBLIC_API_BASE_URL=/api/v1.");
  }
  const presentationProfile = process.env.JDQ_PRESENTATION_PROFILE?.trim() || "local";
  if (presentationProfile !== "local" && presentationProfile !== "public") {
    throw new Error(`Invalid JDQ_PRESENTATION_PROFILE "${presentationProfile}". Must be "local" or "public".`);
  }
  const expectedSiteUrl = presentationProfile === "public"
    ? "https://presentation.juanderquest.app"
    : "http://127.0.0.1:3200";

  if (process.env.NEXT_PUBLIC_SITE_URL !== expectedSiteUrl) {
    throw new Error(`Presentation mode (${presentationProfile} profile) requires NEXT_PUBLIC_SITE_URL=${expectedSiteUrl}, got "${process.env.NEXT_PUBLIC_SITE_URL}".`);
  }
  if (process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE !== "true") {
    throw new Error("Presentation mode requires NEXT_PUBLIC_JDQ_PRESENTATION_MODE=true.");
  }
}

const nextConfig: NextConfig = {
  basePath,
  ...(distDir ? { distDir } : {}),
  async redirects() {
    return [{ source: "/download/juanderquest-latest.apk", destination: latestAndroidApk, permanent: false }];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget ?? `http://127.0.0.1:${localApiPort}`}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    if (distDir === ".next-presentation") {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "X-Robots-Tag",
              value: "noindex, nofollow, noarchive",
            },
          ],
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
