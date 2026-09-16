/** @type {import('next').NextConfig} */
const nextConfig = {
  // 100% static / serverless frontend. `next build` emits ./out which deploys
  // to Vercel (or any static host) with no server, database or API.
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;