import type { NextConfig } from "next";

const nextConfig: NextConfig = {

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

