'use client'

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import AnimateOnScroll from '../Animated/animated-appear';

interface SectionReasonProps {
  items: any[];
}

const SectionReason: React.FC<SectionReasonProps> = ({ items }) => {
  const t = useTranslations();
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

  const handlePaginationClick = useCallback((index: number) => {
    if (swiperRef.current) {
      swiperRef.current.slideToLoop(index);
    }
  }, []);

  const formatNumber = (num: number) => {
    return String(num + 1).padStart(2, '0');
  };

  return (
    <section className="relative h-[660px] md:h-[550px] xl:h-[810px]">
      {/* Title overlay */}
      <div className="absolute inset-0 w-full pt-[38px] xl:pt-10 z-10 pointer-events-none">
        <div className="container">
          <AnimateOnScroll animate="slideup" delay={300}>
            <h2 className="display-2 max-lg:text-[22px] text-white text-center">
              {t('home.section-3.title')}
            </h2>
          </AnimateOnScroll>
        </div>
      </div>

      {/* Custom Vertical Pagination */}
      <div className="absolute max-md:left-1/2 max-md:-translate-x-1/2 max-md:bottom-4 md:right-0 md:top-1/2 md:-translate-y-1/2 z-20 flex flex-row md:flex-col justify-center md:justify-end items-center md:items-end gap-2 md:pr-8">
        {items.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              onClick={() => handlePaginationClick(index)}
              className="flex items-center gap-2 md:gap-3 cursor-pointer group"
              aria-label={`Go to slide ${index + 1}`}
            >
              {/* Number */}
              <span
                className={`size-10 md:size-12 flex items-center justify-center transition-all duration-500 ease-out select-none rounded-full
                  ${isActive
                    ? "headline-3 text-white bg-secondary"
                    : "title-3 text-white/50"
                  }
                `}
              >
                {formatNumber(index)}
              </span>

              {/* Line */}
              <span
                className={`
                  block h-[2px] transition-all duration-500 ease-out bg-white/50
                  ${index === items.length - 1 ? 'hidden md:block' : 'block'}
                  ${isActive
                    ? "w-[30px] md:w-[75px] xl:w-[100px]"
                    : "w-[30px] xl:w-[32px]"
                  }
                `}
              />

              {/* Dot / Ring indicator */}
              <div className="relative hidden md:block">
                <div
                  className={`
                  size-5 border-[1.5px] rounded-full transition-all duration-500 ease-in-out
                  ${isActive
                      ? "border-white"
                      : "border-transparent"
                    }
                `}
                ></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-white"></div>
              </div>

            </button>
          );
        })}
      </div>

      {/* Swiper */}
      <div className="relative swiper-choose-us h-full">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={handleSlideChange}
          className="!static h-full"
          autoplay={{
            delay: 3000,
            disableOnInteraction: true,
          }}
          loop
        >
          {items.map((item, index) => (
            <SwiperSlide key={index} className="h-full w-full relative">
              <img
                src={item.image.url}
                alt={item.image.alt}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 w-full h-full bg-linear-chooseus"></div>
              <div className="max-w-[840px] w-full md:h-full absolute top-20 md:top-0 left-0 flex items-center">
                <div className="md:p-6 p-6 lg:p-10 xl:p-16 md:space-y-4 space-y-6 xl:space-y-6 max-w-[520px] xl:max-w-[560px] w-full max-md:bg-[#fffced94] max-md:backdrop-blur-[3px] max-md:rounded-3xl mx-8">
                  <h3 className="display-2 max-md:text-[36px] md:text-yellow text-primary">{item.title}</h3>
                  <p className="body-1 md:text-white text-primary">{item.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default SectionReason;
