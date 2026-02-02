/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/ai-therapist",
  assetPrefix: "/ai-therapist",
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@agora/conversational-ai", "@agora/agent-ui-kit"],
};

export default nextConfig;
