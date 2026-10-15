import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: false
});

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/en/blog/blog' || pathname.startsWith('/en/blog/blog/')) {
    const rest = pathname.replace(/^\/en\/blog\/blog\/?/, '');
    const targetPath = rest ? `/en/blog/news/${rest}` : '/en/blog';
    return NextResponse.redirect(new URL(`${targetPath}${search}`, request.url), 301);
  }

  if (pathname.startsWith('/en/blog/category/')) {
    const rest = pathname.replace(/^\/en\/blog\/category\//, '');
    return NextResponse.redirect(new URL(`/en/blog/${rest}${search}`, request.url), 301);
  }

  if (pathname.startsWith('/vi/blog/category/') || pathname.startsWith('/blog/category/')) {
    const rest = pathname.replace(/^(\/vi)?\/blog\/category\//, '');
    return NextResponse.redirect(new URL(`/tin-tuc/${rest}${search}`, request.url), 301);
  }

  if (pathname === '/trang-ca-nhan') {
    return NextResponse.redirect(new URL(`/thong-tin-ca-nhan${search}`, request.url), 301);
  }

  if (pathname === '/vi' || pathname.startsWith('/vi/')) {
    const stripped = pathname.replace(/^\/vi(\/|$)/, '/') || '/';
    const viRedirectMap: Array<[RegExp, string]> = [
      [/^\/about\/?$/, '/ve-chung-toi'],
      [/^\/contact\/?$/, '/lien-he'],
      [/^\/product\/(.+)$/, '/san-pham/$1'],
      [/^\/product\/?$/, '/san-pham'],
      [/^\/blog\/(.+)$/, '/tin-tuc/$1'],
      [/^\/blog\/?$/, '/tin-tuc'],
      [/^\/policy\/(.+)$/, '/chinh-sach/$1'],
      [/^\/policy\/?$/, '/chinh-sach'],
      [/^\/signin\/?$/, '/dang-nhap'],
      [/^\/signup\/?$/, '/dang-ky'],
      [/^\/profile\/?$/, '/thong-tin-ca-nhan'],
    ];
    let targetPath = stripped;
    for (const [pattern, replacement] of viRedirectMap) {
      if (pattern.test(stripped)) {
        targetPath = stripped.replace(pattern, replacement);
        break;
      }
    }
    return NextResponse.redirect(new URL(`${targetPath}${search}`, request.url), 301);
  }

  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(vi|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};

