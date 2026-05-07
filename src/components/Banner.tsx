import Image from "next/image";
import React from "react";

type BannerProps = {
  banner: {
    image: {
      url: string;
      alt?: string;
    };
    image_mobile: {
      url: string;
      alt?: string;
    };
  };
  classHeight?: string;
};

const Banner: React.FC<BannerProps> = ({ banner, classHeight = "h-[162px] md:h-[480px]" }) => {
  const imageSrc = banner.image?.url || '/cover.jpg';
  const imageMobileSrc = banner.image_mobile?.url || '/cover.jpg';


  return (
    <div
      className={`relative w-full ${classHeight}`}
    >
      <Image
        src={imageMobileSrc}
        alt={banner.image_mobile?.alt || "banner mobile"}
        fill
        priority
        className="h-full w-full object-cover lg:hidden"
      />
      <Image
        src={imageSrc}
        alt={banner.image?.alt || "banner"}
        fill
        priority
        className="h-full w-full object-cover hidden lg:block"
      />
    </div>
  );
};

export default Banner;
