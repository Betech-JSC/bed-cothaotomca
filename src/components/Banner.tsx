import Image from "next/image";
import React from "react";

type BannerProps = {
  banner: {
    image: {
      url: string;
      alt?: string;
    };
  };
  height?: string | number;
};

const Banner: React.FC<BannerProps> = ({ banner, height = 480 }) => {
  const bannerHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className="relative w-full"
      style={{
        height: bannerHeight,
      }}
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
