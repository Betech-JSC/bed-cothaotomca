import Image from "next/image";
import React from "react";
import { formatImageUrl } from "@/lib/format";

type BannerProps = {
  banner: {
    image: {
      url: string;
      alt?: string;
    };
    image_mobile?: {
      url: string;
      alt?: string;
    };
  };
  classHeight?: string;
};

const Banner: React.FC<BannerProps> = ({
  banner,
  classHeight = "w-full min-h-[162px] aspect-[16/9] max-h-[360px] md:max-h-[440px] xl:max-h-[480px]",
}) => {
  const imageSrc = formatImageUrl(banner.image?.url) || '/cover.jpg';
  const imageMobileSrc = formatImageUrl(banner.image_mobile?.url) || imageSrc;

  return (
    <div
      className={`relative w-full ${classHeight}`}
    >
      <Image
        src={imageMobileSrc}
        alt={banner.image_mobile?.alt || "banner mobile"}
        fill
        priority
        className="h-full w-full object-cover object-center lg:hidden"
      />
      <Image
        src={imageSrc}
        alt={banner.image?.alt || "banner"}
        fill
        priority
        className="h-full w-full object-cover object-center hidden lg:block"
      />
    </div>
  );
};

export default Banner;
