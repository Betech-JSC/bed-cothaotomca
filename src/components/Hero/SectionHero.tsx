'use client'

import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import Arrow from '../Icons/Arrow';

interface SectionHeroProps {
  items: any[];
}

const SectionHero: React.FC<SectionHeroProps> = ({ items }) => {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="h-[195px] md:h-[550px] xl:h-[706px]">
      <div className="relative swiper-hero h-full group">
        <Swiper
          modules={[Navigation, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{
            clickable: true,
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          loop={items.length > 1}
          className="!static h-full"
        >
          {items.map((item, index) => {
            const imageSrc = item.image?.url || '/cover.jpg';
            return (
              <SwiperSlide key={index} className="h-full">
                <div className="relative h-full">
                  <Image
                    src={imageSrc}
                    alt={item.image?.alt || 'Hero image'}
                    fill
                    priority={index === 0}
                    className="object-cover w-full h-full"
                  />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Navigation Buttons */}
        {items.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 absolute -translate-y-1/2  z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              aria-label="Previous slide"
            >
              <div>
                <Arrow />
              </div>
            </button>

            {/* Next Button */}
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 absolute -translate-y-1/2  z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              aria-label="Next slide"
            >
              <div className="-rotate-180">
                <Arrow />
              </div>
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default SectionHero;
