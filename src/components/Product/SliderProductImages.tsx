'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface SliderProductImagesProps {
  items: any[];
}

const SliderProductImages: React.FC<SliderProductImagesProps> = ({ items }) => {
  const t = useTranslations();
  return (
    <div className="relative swiper-related-product">
      <Swiper
        modules={[]}
        spaceBetween={24}
        slidesPerView={1}
        loop
        centeredSlides
        breakpoints={{
          320: {
            slidesPerView: 1.2,
            spaceBetween: 12,
          },
          640: {
            slidesPerView: 2,
            spaceBetween: 16,
          },
        }}
        className="!static"
      >
        {items.map((item) => (
          <SwiperSlide key={item.id}>
            <div className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
              <Image
                src={item.url}
                alt={item.alt || item.title || "image product"}
                fill
                className="object-cover w-full h-full"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default SliderProductImages;
