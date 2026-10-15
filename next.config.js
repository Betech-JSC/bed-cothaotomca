const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
  async redirects() {
    return [
      {
        source: '/en/blog/blog/:slug*',
        destination: '/en/blog/news/:slug*',
        permanent: true,
      },
      {
        source: '/en/blog/blog',
        destination: '/en/blog',
        permanent: true,
      },
      {
        source: '/en/blog/category/:slug*',
        destination: '/en/blog/:slug*',
        permanent: true,
      },
      {
        source: '/vi/blog/category/:slug*',
        destination: '/tin-tuc/:slug*',
        permanent: true,
      },
      {
        source: '/blog/category/:slug*',
        destination: '/tin-tuc/:slug*',
        permanent: true,
      },
      {
        source: '/vi/about',
        destination: '/ve-chung-toi',
        permanent: true,
      },
      {
        source: '/vi/contact',
        destination: '/lien-he',
        permanent: true,
      },
      {
        source: '/vi/product/:path*',
        destination: '/san-pham/:path*',
        permanent: true,
      },
      {
        source: '/vi/product',
        destination: '/san-pham',
        permanent: true,
      },
      {
        source: '/vi/blog/:path*',
        destination: '/tin-tuc/:path*',
        permanent: true,
      },
      {
        source: '/vi/blog',
        destination: '/tin-tuc',
        permanent: true,
      },
      {
        source: '/vi/policy/:path*',
        destination: '/chinh-sach/:path*',
        permanent: true,
      },
      {
        source: '/vi/policy',
        destination: '/chinh-sach',
        permanent: true,
      },
      {
        source: '/vi/signin',
        destination: '/dang-nhap',
        permanent: true,
      },
      {
        source: '/vi/signup',
        destination: '/dang-ky',
        permanent: true,
      },
      {
        source: '/vi/profile',
        destination: '/thong-tin-ca-nhan',
        permanent: true,
      },
      {
        source: '/trang-ca-nhan',
        destination: '/thong-tin-ca-nhan',
        permanent: true,
      },
      {
        source: '/vi',
        destination: '/',
        permanent: true,
      },
      {
        source: '/vi/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);

