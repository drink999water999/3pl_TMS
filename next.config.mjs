/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // @react-pdf/renderer must stay a runtime Node require, not webpack-bundled,
    // or the PDF renderer breaks during `next build` (Next 14 puts this under
    // experimental; it becomes top-level serverExternalPackages in Next 15).
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { dev }) => {
    // Next 14's bundled webpack writes a gzip-compressed persistent cache to
    // disk. On very new Node versions (22/24) that gzip step can throw
    // "Array buffer allocation failed" and cascade into an out-of-memory crash.
    // An in-memory cache sidesteps the disk/gzip path entirely. (The proper fix
    // is to run a supported Node version — 20 LTS or 22.)
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
