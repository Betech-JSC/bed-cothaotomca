const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // unoptimized: true,
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
        hostname: "**.betech-digital.com",
      },
      {
        protocol: "http",
        hostname: "**.betech-digital.com",
      },
      {
        protocol: "https",
        hostname: "cothaotomca.vn",
      },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
