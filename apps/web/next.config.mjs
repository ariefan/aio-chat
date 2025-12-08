/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000', 'genai.technosmart.id'],
    },
  },
}

export default nextConfig
