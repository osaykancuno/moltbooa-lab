import type { NextConfig } from "next";
import path from "node:path";

// Content Security Policy.
//
// wagmi + RainbowKit rely on WebAssembly (`wasm-unsafe-eval`) for crypto
// operations, and parts of the WalletConnect stack use Function() at
// runtime (`unsafe-eval`). Tailwind + Next Image inject inline styles.
// We keep connect-src wide-open on https: so the Studio's public
// `/agent/[tokenId]` chat can talk to any endpoint a holder has deployed.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Pin Turbopack's project root so it stops picking up the stray
  // package-lock.json in the user's home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
