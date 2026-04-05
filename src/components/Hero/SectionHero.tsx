'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Image from 'next/image';

interface SectionHeroProps {
  items: any[];
}

const SectionHero: React.FC<SectionHeroProps> = ({ items }) => {
  return (
    <section className="h-[650px] md:h-[550px] xl:h-[706px]">
      <div className="relative swiper-hero h-full">
        <Swiper
          modules={[Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{
            clickable: true,
          }}
          className="!static h-full"
        >
          {items.map((item, index) => (
            <SwiperSlide key={index} className="h-full">
              <div className="relative h-full">
                <Image
                  src={item.image.url}
                  alt={item.image.alt}
                  fill
                  priority={index === 0}
                  className="object-cover w-full h-full"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default SectionHero;
