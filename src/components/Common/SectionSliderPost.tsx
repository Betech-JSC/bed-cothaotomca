'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Arrow from '../Icons/Arrow';
import CardBlog from '../Card/CardBlog';
import { Link } from '@/i18n/i18n-navigation';

interface SectionSliderPostProps {
  items: any[];
}

const SectionSliderPost: React.FC<SectionSliderPostProps> = ({ items }) => {
  return (
    <section className="md:py-16 py-12 xl:py-[100px]">
      <div className="container md:space-y-6 space-y-4 xl:space-y-8">
        <h2 className="display-3 text-center text-primary">Góc Bếp Cô Thảo</h2>
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
            breakpoints={{
              640: {
                slidesPerView: 2,
              },
              1024: {
                slidesPerView: 3,
              },
              1280: {
                slidesPerView: 3,
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
            <button className="swiper-btn-prev absolute left-0 xl:-left-12 top-[117px] -translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div>
                <Arrow />
              </div>
            </button>
            <button className="swiper-btn-next absolute right-0 xl:-right-12 top-[117px] translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div className="-rotate-180">
                <Arrow />
              </div>
            </button>
          </Swiper>
        </div>
        <Link href="/blog" className="btn btn-primary max-w-[240px] w-full mx-auto">tìm hiểu thêm</Link>
      </div>
    </section>
  );
};

export default SectionSliderPost;
