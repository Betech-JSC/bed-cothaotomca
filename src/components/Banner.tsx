import Image from "next/image";
import React from "react";

type BannerProps = {
  banner: {
    image: {
      url: string;
      alt?: string;
    };
  };
  classHeight?: string;
};

const Banner: React.FC<BannerProps> = ({ banner, classHeight = "h-[162px] md:h-[480px]" }) => {
  const imageSrc = banner.image?.url || '/cover.jpg';

  return (
    <div
      className={`relative w-full ${classHeight}`}
    >
      <Image
        src={imageSrc}
        alt={banner.image?.alt || "banner"}
        fill
        priority
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default Banner;
