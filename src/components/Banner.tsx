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

const Banner: React.FC<BannerProps> = ({ banner, classHeight = "h-[480px]" }) => {

  return (
    <div
      className={`relative w-full ${classHeight}`}
    >
      <Image
        src={banner.image.url}
        alt={banner.image.alt || "banner"}
        fill
        priority
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default Banner;
