import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

// Must be the Nest origin (host:port). Never use NEXT_PUBLIC_API_URL here —
// that value is a browser path like "/api".
const apiOrigin = (
  process.env.API_PROXY_TARGET?.trim() || "http://localhost:3001"
).replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/auth/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
  async rewrites() {
    // afterFiles: keep Next route handlers (e.g. /api/ai) ahead of the Nest proxy.
    // Path-scoped so we never swallow every /api/* App Router route.
    return {
      afterFiles: [
        {
          source: "/api/auth/:path*",
          destination: `${apiOrigin}/auth/:path*`,
        },
        {
          source: "/api/timelines/:path*",
          destination: `${apiOrigin}/timelines/:path*`,
        },
        {
          source: "/api/health",
          destination: `${apiOrigin}/health`,
        },
      ],
    };
  },
  async redirects() {
    return [
      // Old proxy prefix.
      {
        source: "/backend/:path*",
        destination: "/api/:path*",
        permanent: false,
      },
      // Safety net: bookmarks hitting Nest paths on the web origin.
      {
        source: "/auth/google",
        destination: "/api/auth/google",
        permanent: false,
      },
      {
        source: "/auth/linkedin",
        destination: "/api/auth/linkedin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
