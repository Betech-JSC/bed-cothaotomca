"use client";

import { usePathname, useRouter } from "@/i18n/i18n-navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import Image from "next/image";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextLocale = locale === "vi" ? "en" : "vi";

  const handleToggle = () => {
    const targetSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";
    router.replace((pathname + targetSearch) as any, { locale: nextLocale });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="relative block size-6 cursor-pointer overflow-hidden rounded-full"
      aria-label={nextLocale === "en" ? "Switch to English" : "Chuyển sang tiếng Việt"}
    >
      <Image
        src={locale === "vi" ? "/images/flag-us.jpg" : "/images/flag-vn.jpg"}
        alt={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        fill
        className="h-full w-full object-cover"
      />
    </button>
  );
}
