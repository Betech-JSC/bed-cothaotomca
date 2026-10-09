"use client";
import { useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/i18n-navigation";
import Image from "next/image";
import Logo from "../Logo";
import Hotline from "../Icons/Hotline";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";
import { useBranches } from "@/contexts/BranchContext";
import { useTranslations } from "next-intl";
import Chat from "../Icons/Chat";
import { formatImageUrl } from "@/lib/format";


const Footer = () => {
  const t = useTranslations();
  const branches = useBranches();
  const [openBranchIndex, setOpenBranchIndex] = useState<number | null>(0);
  const sortedBranches = useMemo(() => {
    return [...branches].sort(
      (a, b) => (a.sort_order ?? a.id ?? 0) - (b.sort_order ?? b.id ?? 0)
    );
  }, [branches]);

  const pathname = usePathname();
  const settings = useGeneralSettings();
  const hotline = settings?.hotline || "024.9999.7122";
  const hotlineClean = hotline.replace(/[^0-9+]/g, "");
  const isAuthPage = [
    "/signin",
    "/dang-nhap",
    "/signup",
    "/dang-ky",
    "/login",
    "/register",
    "/forgot-password",
    "/quen-mat-khau",
    "/reset-password",
    "/dat-lai-mat-khau",
  ].some((path) => pathname === path || pathname?.includes(path));

  const isShowWave = pathname === "/" || pathname === "/about";
  const noMarginTop = isShowWave || isAuthPage;

  return (
    <footer className={`relative z-10 bg-primary overflow-x-clip pt-16 md:pt-8 xl:pt-16 pb-6 ${noMarginTop ? "mt-0" : "mt-12 md:mt-20"}`}>
      {isShowWave && (
        <div className="hidden lg:block absolute top-0 left-0 w-full -translate-y-[90%] pointer-events-none z-10">
          <img
            src="/images/footer/bg-wave.png"
            alt="background wave"
            className="w-full h-auto block"
          />
        </div>
      )}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Image
          src="/images/footer/bg-footer.jpg"
          alt="background footer"
          fill
          className="object-cover object-bottom w-full h-full lg:block hidden"
        />
        <Image
          src="/images/footer/bg-footer-mobile-1.png"
          alt="background footer"
          fill
          className="object-cover object-bottom w-full h-full lg:hidden"
        />
      </div>
      <div className="relative z-20">
        <div className="container md:space-y-16 space-y-12 xl:space-y-20">
          <div className="grid grid-cols-12 md:gap-6 gap-y-16 xl:gap-8">
            <div className="col-span-full lg:col-span-5 xl:col-span-6 flex items-center">
              <div className="max-lg:mx-auto lg:max-w-[445px]">
                <Logo
                  width={445}
                  height={285}
                  className="xl:block hidden"
                />
                <Logo
                  width={239}
                  height={152}
                  className="xl:hidden"
                />
              </div>
            </div>
            <div className="col-span-full lg:col-span-7 xl:col-span-6 text-gray-200 space-y-6 md:space-y-6 xl:space-y-8">
              <div className="title-1 underline">{t('footer.showroom')}</div>
              {/* Mobile Showroom Accordion (md:hidden) */}
              <div className="block md:hidden space-y-2.5">
                {sortedBranches.map((itemShowroom, indexShowroom) => {
                  const isOpen = openBranchIndex === indexShowroom;
                  return (
                    <div
                      key={itemShowroom.id ?? indexShowroom}
                      className="rounded-xl border border-white/20 bg-white/5 overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenBranchIndex(isOpen ? null : indexShowroom)}
                        className="w-full flex items-center justify-between p-3.5 text-left font-display font-bold text-sm text-white hover:text-secondary transition-colors cursor-pointer"
                        aria-expanded={isOpen}
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-white text-xs font-bold shrink-0">
                            {indexShowroom + 1}
                          </span>
                          <span>{t('footer.branch')} {indexShowroom + 1}</span>
                        </span>
                        <svg
                          className={`size-4 text-white transition-transform duration-300 ${isOpen ? "rotate-180 text-secondary" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="animate-slide-down-branch px-3.5 pb-3.5 pt-1 space-y-2 border-t border-white/10 text-xs sm:text-sm text-gray-200">
                          <div className="relative aspect-w-3 aspect-h-2 rounded-lg overflow-hidden my-2">
                            <Image
                              src={formatImageUrl(itemShowroom.image) || '/cover.jpg'}
                              alt={itemShowroom.address || `Showroom ${indexShowroom + 1}`}
                              fill
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <p className="body-2 text-gray-300 leading-relaxed">
                            {itemShowroom.address}
                          </p>
                          {itemShowroom.phone && (
                            <div>
                              <a
                                href={`tel:${itemShowroom.phone.replace(/[^0-9+]/g, "")}`}
                                className="inline-flex items-center gap-1.5 text-xs text-secondary font-medium hover:underline"
                              >
                                <span>Hotline: {itemShowroom.phone}</span>
                              </a>
                            </div>
                          )}
                          {itemShowroom.address_link && (
                            <div>
                              <a
                                href={itemShowroom.address_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-yellow hover:text-secondary font-semibold hover:underline mt-1"
                              >
                                <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{t('footer.directions') || "Chỉ đường trên Google Maps"}</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Showroom Grid (hidden md:grid) */}
              <div className="hidden md:grid md:grid-cols-2 md:gap-4 gap-y-4 sm:gap-y-5 xl:gap-6">
                {sortedBranches.map((itemShowroom, indexShowroom) => (
                  <a
                    href={itemShowroom.address_link || "#"}
                    target={itemShowroom.address_link ? "_blank" : undefined}
                    rel={itemShowroom.address_link ? "noopener noreferrer" : undefined}
                    key={indexShowroom}
                    className="relative rounded-[14px] overflow-hidden shadow-sm space-y-2 group"
                  >
                    <div className="aspect-w-3 aspect-h-2">
                      <Image
                        src={formatImageUrl(itemShowroom.image) || '/cover.jpg'}
                        alt="background cover"
                        fill
                        className="object-cover w-full h-full lg:group-hover:scale-105 duration-300 ease-in-out"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-gray-200 space-y-1 p-3 sm:p-4 w-full">
                      <div className="title-4 text-white font-bold">{t('footer.branch')} {indexShowroom + 1}</div>
                      <div className="body-2 line-clamp-2 break-words text-xs sm:text-sm text-gray-200 lg:group-hover:text-secondary transition-all duration-300 ease-in-out">
                        {itemShowroom.address}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center md:gap-4 xl:gap-6 gap-3">
                  <a href={`tel:${hotlineClean}`} className="border border-white py-2.5 px-4 rounded-full flex items-center gap-1.5 title-2 text-white w-max lg:hover:border-secondary lg:hover:text-secondary transition-all duration-300 ease-in-out whitespace-nowrap shrink-0">
                    <Hotline />
                    <span>{hotline}</span>
                  </a>
                  <a href={settings?.link_facebook || '#'} target="_blank" rel="noopener noreferrer nofollow" className="border border-white py-2.5 px-4 rounded-full flex items-center gap-1.5 title-2 text-white w-max lg:hover:border-secondary lg:hover:text-secondary transition-all duration-300 ease-in-out whitespace-nowrap shrink-0">
                    <Chat />
                    <span>{t('button.message-now')}</span>
                  </a>
                  <Link href="/order-lookup" className="border border-white py-2.5 px-4 rounded-full flex items-center gap-1.5 title-2 text-white w-max lg:hover:border-secondary lg:hover:text-secondary transition-all duration-300 ease-in-out whitespace-nowrap shrink-0">
                    <span>{t('orderLookup.title')}</span>
                  </Link>
                </div>
                <div className="relative max-w-[130px] w-full h-[50px]">
                  <Image
                    src="/images/image-verification.png"
                    alt={t('footer.bct_verification')}
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center md:text-right body-2 text-white/70" suppressHydrationWarning>
            © {new Date().getFullYear()} Cô Thảo Tôm Cá. All rights reserved.
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
