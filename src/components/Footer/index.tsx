"use client";
import { Link, usePathname } from "@/i18n/i18n-navigation";
import Image from "next/image";
import Logo from "../Logo";
import Hotline from "../Icons/Hotline";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";
import { useBranches } from "@/contexts/BranchContext";
import { useTranslations } from "next-intl";
import Chat from "../Icons/Chat";


const Footer = () => {
  const t = useTranslations();
  const branches = useBranches();

  const pathname = usePathname();
  const settings = useGeneralSettings();
  const hotline = settings?.hotline?.replace(/\s/g, '') || "0987 654 321";
  const hotlineClean = hotline.replace(/\s/g, "");
  const isShowWave = pathname === "/" || pathname === "/about";

  return (
    <footer className="relative z-10 bg-white pt-16 md:pt-20 xl:pt-40 pb-6">
      <div className="absolute inset-0">
        <Image
          src="/images/footer/bg-footer.png"
          alt="background footer"
          fill
          className="object-cover w-full h-full md:block hidden"
        />
        <Image
          src="/images/footer/bg-footer-mobile.png"
          alt="background footer"
          fill
          className="object-fill w-full h-full md:hidden"
        />
      </div>
      {isShowWave && (
        <div className="absolute md:block hidden md:top-[-36px] lg:top-[-17%] left-0 z-[-1] lg:h-[20%] w-full">
          <img
            src="/images/footer/bg-wave.png"
            alt="background wave"
            className="object-cover w-full h-full"
          />
        </div>
      )}
      <div className="relative z-20">
        <div className="container md:space-y-16 space-y-12 xl:space-y-20">
          <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">
            <div className="col-span-full lg:col-span-5 xl:col-span-6 flex items-center">
              <div className="max-md:mx-auto lg:max-w-[445px] max-md:mt-10">
                <Logo
                  width={445}
                  height={285}
                  className="md:block hidden"
                />
                <Logo
                  width={300}
                  height={192}
                  className="md:hidden"
                />
              </div>
            </div>
            <div className="col-span-full lg:col-span-7 xl:col-span-6 text-gray-200 space-y-4 md:space-y-6 xl:space-y-8">
              <div className="title-1 underline">{t('footer.showroom')}</div>
              <div className="grid md:grid-cols-2 md:gap-4 gap-y-6 xl:gap-6">
                {branches.map((itemShowroom, indexShowroom) => (
                  <a
                    href={itemShowroom.address_link || "#"}
                    target={itemShowroom.address_link ? "_blank" : undefined}
                    rel={itemShowroom.address_link ? "noopener noreferrer" : undefined} key={indexShowroom} className="relative rounded-[12px] overflow-hidden space-y-2 group">
                    <div className="aspect-w-3 aspect-h-2">
                      <Image
                        src={itemShowroom.image || '/cover.jpg'}
                        alt="background cover"
                        fill
                        className="object-cover w-full h-full lg:group-hover:scale-105 duration-300 ease-in-out"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 bg-linear-branch text-gray-200 space-y-1 p-2">
                      <div className="title-4">{t('footer.branch')} {indexShowroom + 1}</div>
                      <div className="body-2 lg:group-hover:text-secondary transition-all duration-300 ease-in-out">
                        {itemShowroom.address}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex md:flex-row flex-col md:gap-6 gap-3">
                  <a href={`tel:${hotlineClean}`} className="border border-white py-2.5 px-4 rounded-full flex items-center gap-1 title-2 text-white w-max lg:hover:border-secondary lg:hover:text-secondary transition-all duration-300 ease-in-out">
                    <Hotline />
                    <span>{hotline}</span>
                  </a>
                  <a href={settings?.link_facebook || '#'} target="_blank" rel="noopener noreferrer nofollow" className="border border-white py-2.5 px-4 rounded-full flex items-center gap-1 title-2 text-white w-max lg:hover:border-secondary lg:hover:text-secondary transition-all duration-300 ease-in-out">
                    <Chat />
                    <span>{t('button.message-now')}</span>
                  </a>
                </div>
                <div className="relative max-w-[130px] w-full h-[50px]">
                  <Image
                    src="/images/image-vertification.png"
                    alt="image vertification"
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-right body-2 text-white" suppressHydrationWarning>
            © {new Date().getFullYear()} Cô Thảo Tôm Cá. All rights reserved.
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
