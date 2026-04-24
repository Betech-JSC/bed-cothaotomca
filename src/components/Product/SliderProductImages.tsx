'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface SliderProductImagesProps {
  items: any[];
}

const SliderProductImages: React.FC<SliderProductImagesProps> = ({ items }) => {
  const t = useTranslations();
  return (
    <div className="relative swiper-product">
      <Swiper
        modules={[Pagination]}
        spaceBetween={24}
        slidesPerView={1}
        loop
        pagination={{
          clickable: true,
        }}
        breakpoints={{
          320: {
            slidesPerView: 1,
            spaceBetween: 16,
          },
          640: {
            slidesPerView: 2,
            spaceBetween: 16,
          },
        }}
        className="!static"
      >
        {items.map((item) => {
          const imageSrc = item.url || '/cover.jpg';
          return (
            <SwiperSlide key={item.id}>
              <div className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
                <Image
                  src={imageSrc}
                  alt={item.alt || item.title || "image product"}
                  fill
                  className="object-cover w-full h-full"
                />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default SliderProductImages;
