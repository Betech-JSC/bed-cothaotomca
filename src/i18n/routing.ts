import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'vi'],

  // Used when no locale matches
  defaultLocale: 'vi',

  // No prefix for default locale
  localePrefix: 'as-needed',

  // Custom pathnames for each locale
  pathnames: {
    '/': '/',
    '/about': {
      vi: '/gioi-thieu',
      en: '/about',
    },
    '/blog': {
      vi: '/tin-tuc',
      en: '/blog',
    },
    '/contact': {
      vi: '/lien-he',
      en: '/contact',
    },
    '/product': {
      vi: '/san-pham',
      en: '/product',
    },
    '/policy': {
      vi: '/chinh-sach',
      en: '/policy',
    },
    '/search': {
      vi: '/tim-kiem',
      en: '/search',
    }
  }
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
