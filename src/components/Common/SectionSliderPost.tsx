'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Arrow from '../Icons/Arrow';
import CardBlog from '../Card/CardBlog';
import { Link } from '@/i18n/i18n-navigation';
import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../Animated/animated-appear';

interface SectionSliderPostProps {
  items: any[];
}

const SectionSliderPost: React.FC<SectionSliderPostProps> = ({ items }) => {
  const t = useTranslations();
  return (
    <section className="md:pt-16 pt-12 xl:pt-[100px] md:pb-[100px] pb-20 xl:pb-[160px]">
      <div className="md:container md:space-y-6 space-y-8 xl:space-y-8">
        <AnimateOnScroll animate="slideup" delay={0}>
          <h2 className="display-3 text-center text-primary">{t('blog.title')}</h2>
        </AnimateOnScroll>
        <div className="relative swiper-related-product">
          <Swiper
            modules={[Navigation]}
            spaceBetween={24}
            slidesPerView={1}
            navigation={{
              prevEl: '.swiper-btn-prev',
              nextEl: '.swiper-btn-next',
            }}
            pagination={{
              clickable: true,
            }}
            loop
            centeredSlides={true}
            breakpoints={{
              320: {
                slidesPerView: 1.2,
                spaceBetween: 14,
              },
              640: {
                slidesPerView: 2,
                spaceBetween: 24,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 24,
              },
              1280: {
                slidesPerView: 3,
                spaceBetween: 24,
              },
            }}
            className="!static"
          >
            {items.map((item, index) => (
              <SwiperSlide key={index}>
                <CardBlog item={item} />
              </SwiperSlide>
            ))}

            {/* Custom Navigation Buttons */}
            <button aria-label="Previous Post" className="swiper-btn-prev absolute left-0 xl:-left-12 top-[117px] -translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div>
                <Arrow />
              </div>
            </button>
            <button aria-label="Next Post" className="swiper-btn-next absolute right-0 xl:-right-12 top-[117px] translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div className="-rotate-180">
                <Arrow />
              </div>
            </button>
          </Swiper>
        </div>
        <Link
          href="/blog"
          className="btn btn-primary max-w-[240px] w-full mx-auto"
          aria-label={t('button.learn-more')}
        >
          {t('button.learn-more')}
        </Link>
      </div>
    </section>
  );
};

export default SectionSliderPost;
