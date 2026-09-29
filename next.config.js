const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "api.builder.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "staging-cothaotomca.betech-digital.com",
      },
      {
        protocol: "https",
        hostname: "cothaotomca.vn",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "api.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "dev.vietqr.org",
      },
      {
        protocol: "https",
        hostname: "pro.vietqr.vn",
      },
    ],
  },
};

module.exports = withNextIntl(nextConfig);

