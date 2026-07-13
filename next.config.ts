import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // Ensure the VidLink WASM resolver assets are traced into the serverless
  // bundle for /api/stream (they are read from disk at runtime, not imported).
  outputFileTracingIncludes: {
    '/api/stream': ['./lib/vidlink/**', './node_modules/libsodium-wrappers/**', './node_modules/libsodium/**'],
  },

  // Allow VidFast iframe embedding + mobile media features
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/(movie|tv|anime)/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'fullscreen=*, autoplay=*, encrypted-media=*, picture-in-picture=*, accelerometer=*, gyroscope=*',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '**.tmdb.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
  /* other config options here */
};

export default nextConfig;

