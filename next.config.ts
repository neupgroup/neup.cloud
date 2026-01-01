import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Exclude server-only packages from webpack bundling
  serverExternalPackages: ['ssh2', 'node-ssh', 'cpu-features'],
  webpack: (config, { isServer }) => {
    // For client-side builds, mark these as external
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        'ssh2': false,
        'node-ssh': false,
        'cpu-features': false,
      };
    }
    return config;
  },
};

export default nextConfig;
