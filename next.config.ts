import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // basePath: '/account',
  // assetPrefix: '/account/',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'neupcdn.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Exclude server-only packages from webpack bundling
  serverExternalPackages: ['ssh2', 'node-ssh', 'cpu-features'],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
