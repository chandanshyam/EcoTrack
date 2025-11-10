/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['maps.googleapis.com'],
  },
  // Enable standalone output for Docker/Cloud Run deployments
  output: 'standalone',
  // Optimize production builds
  poweredByHeader: false,
  compress: true,
}

module.exports = nextConfig