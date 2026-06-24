import type { NextConfig } from "next";

// Backend (Flask) origin. Defaults to the local dev server on :5000.
// Overridable so the same build can point at a deployed backend later.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.postimg.cc" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      // IGDB serves game covers from images.igdb.com (cover_url stored in the
      // backend Game cache is https://images.igdb.com/.../t_cover_big/...).
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  /**
   * Same-origin proxy to the Flask backend.
   *
   * Why: the browser only ever talks to the Next origin (localhost:3000), so
   * Flask-Login's session cookie stays same-origin and no CORS is needed
   * (CORS was deliberately removed from the backend — see project CLAUDE.md).
   *
   * - /api/*     -> Flask JSON API (the `backend/api.py` blueprint, url_prefix=/api)
   * - /uploads/* -> Flask static uploads folder, so user avatars load same-origin
   *                 without registering localhost in `images.remotePatterns`.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_ORIGIN}/static/uploads/:path*`,
      },
      {
        // Backend-owned static assets (e.g. the default fallback avatar).
        // Next does not serve /static itself, so this is collision-free.
        source: "/static/:path*",
        destination: `${BACKEND_ORIGIN}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
