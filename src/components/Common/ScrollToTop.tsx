'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Chỉ cuộn lên đầu trang khi người dùng thực sự chuyển sang trang mới (Route Change)
    // TUYỆT ĐỐI không cuộn khi thay đổi query params (lọc nguyên liệu, chuyển trang, v.v.)
    if (prevPathname.current !== pathname) {
      // Bỏ qua cuộn lên đỉnh nếu người dùng chỉ chuyển đổi danh mục trong trang sản phẩm hoặc tin tức
      const isProductSubNav =
        (prevPathname.current?.includes('/product') || prevPathname.current?.includes('/san-pham')) &&
        (pathname?.includes('/product') || pathname?.includes('/san-pham'));

      const isBlogSubNav =
        (prevPathname.current?.includes('/blog') || prevPathname.current?.includes('/tin-tuc')) &&
        (pathname?.includes('/blog') || pathname?.includes('/tin-tuc'));

      if (!isProductSubNav && !isBlogSubNav) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant',
        });
      }
      prevPathname.current = pathname;
    }
  }, [pathname]);

  return null;
}
