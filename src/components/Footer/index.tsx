"use client";
import { Link, usePathname } from "@/i18n/i18n-navigation";
import Image from "next/image";
import Logo from "../Logo";
import Hotline from "../Icons/Hotline";

const Footer = () => {
  const showroooms = [
    {
      title: "Chi nhánh 1",
      address: "123 Hai Bà Trưng, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
      link: "",
    },
    {
      title: "Chi nhánh 2",
      address: "123 Hai Bà Trưng, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
      link: "",
    },
    {
      title: "Chi nhánh 3",
      address: "123 Hai Bà Trưng, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
      link: "",
    },
    {
      title: "Chi nhánh 4",
      address: "123 Hai Bà Trưng, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
      link: "",
    }
  ]

  const pathname = usePathname();
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
        <div className="absolute md:block hidden md:top-[-36px] lg:top-[-60px] xl:top-[-110px] left-0 z-[-1]">
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
            <div className="col-span-full lg:col-span-5 xl:col-span-6">
              <div className="max-md:mx-auto md:max-w-[360px] max-md:mt-10">
                <Logo
                  width={321}
                  height={206}
                />
              </div>
            </div>

            <div className="col-span-full lg:col-span-7 xl:col-span-6 text-gray-200 space-y-4 md:space-y-6 xl:space-y-8">
              <div className="title-1 underline">Hệ thống cửa hàng</div>
              <div className="grid md:grid-cols-2 md:gap-6 gap-4 xl:gap-8">
                {showroooms.map((itemShowroom, indexShowroom) => (
                  <div key={indexShowroom} className="space-y-2">
                    <div className="title-3">{itemShowroom.title}</div>
                    <a href={itemShowroom.link} className="body-1 lg:hover:text-secondary transition-all duration-300 ease-in-out">{itemShowroom.address}</a>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:gap-6 gap-4 xl:gap-8">
                <a href="tel:0987 654 321" className="border border-white py-2.5 px-4 rounded-full flex items-center gap-1 title-2 text-white w-max lg:hover:border-secondary lg:hover:text-secondary transition-all duration-300 ease-in-out">
                  <Hotline />
                  <span>0987 654 321</span>
                </a>
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
