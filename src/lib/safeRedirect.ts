/**
 * Helper kiểm tra & chuẩn hoá tham số `redirect` sau đăng nhập (chống open redirect).
 *
 * Quy tắc (design D6 — change `guest-member-tier-login-hint`):
 * 1. Rỗng / không phải string → fallback.
 * 2. `decodeURIComponent` an toàn (lỗi → fallback); mọi kiểm tra chạy trên giá trị đã giải mã.
 * 3. Từ chối nếu: không bắt đầu bằng `/`; bắt đầu bằng `//` hoặc `/\`; chứa `\`;
 *    chứa ký tự điều khiển; có scheme (`http:`, `javascript:`, `data:`...);
 *    hoặc có `:` trước dấu `/` đầu tiên.
 * 4. `new URL(value, placeholder)` phải giữ nguyên origin placeholder.
 * 5. Bỏ tiền tố locale (`/vi`, `/en`) ở đầu (tương thích link cũ dạng `/vi/checkout`)
 *    để tránh nhân đôi prefix khi push qua router next-intl.
 *
 * Kết quả là pathname nội bộ KHÔNG có locale (vd. `/checkout`), dùng với router next-intl.
 */

export const DEFAULT_LOGIN_REDIRECT = "/profile";

// Đồng bộ với `locales` trong `src/i18n/config.ts` / `src/i18n/routing.ts`.
// Không import trực tiếp `@/i18n/routing` để helper thuần (không kéo next-intl navigation vào).
const LOCALE_PREFIXES = ["vi", "en"] as const;

const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const LOCALE_PREFIX = new RegExp(`^/(?:${LOCALE_PREFIXES.join("|")})(?=[/?#]|$)`, "i");

function isSafeInternalPath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("\\")) return false;
  if (CONTROL_CHARS.test(value)) return false;
  if (SCHEME.test(value)) return false;

  const firstSlash = value.indexOf("/");
  const firstColon = value.indexOf(":");
  if (firstColon !== -1 && (firstSlash === -1 || firstColon < firstSlash)) return false;

  try {
    const parsed = new URL(value, PLACEHOLDER_ORIGIN);
    if (parsed.origin !== PLACEHOLDER_ORIGIN) return false;
  } catch {
    return false;
  }

  return true;
}

export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_LOGIN_REDIRECT
): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  // Ký tự điều khiển (kể cả xuống dòng/tab ở đầu-cuối) bị chặn trước khi trim
  if (CONTROL_CHARS.test(decoded)) return fallback;

  const value = decoded.trim();
  if (!isSafeInternalPath(value)) return fallback;

  // Bỏ tiền tố locale cũ (`/vi/checkout` → `/checkout`, `/en` → `/`)
  let stripped = value.replace(LOCALE_PREFIX, "");
  if (!stripped.startsWith("/")) stripped = `/${stripped}`;

  // Kiểm tra lại sau khi bỏ prefix (vd. `/vi//evil.com` → `//evil.com`)
  if (!isSafeInternalPath(stripped)) return fallback;

  return stripped;
}
