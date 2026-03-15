import type { Locale } from "./i18n";

export const PATHS = {
  home: "/",
  blog: "/blog",
  blogDetails: "/blog-details",
  blogSidebar: "/blog-sidebar",
  about: "/about",
  contact: "/contact",
  signin: "/signin",
  signup: "/signup",
} as const;

export type RouteName = keyof typeof PATHS;

export function getPath(name: RouteName, _locale: Locale): string {
  // Hiện tại chưa prefix locale vào URL, chỉ return path gốc.
  // Sau này nếu muốn dạng /vi/... /en/... chỉ cần đổi hàm này.
  return PATHS[name];
}

