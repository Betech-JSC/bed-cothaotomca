'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import CardProduct from '../Card/CardProduct';
import Arrow from '../Icons/Arrow';

interface SectionSliderPostProps {
  products: any[];
}

const SectionSliderPost: React.FC<SectionSliderPostProps> = ({ products }) => {
  return (
    <section className='bg-yellow py-[60px]'>
      <div className="container space-y-8">
        <h2 className="display-3 text-center text-primary">Khám Phá Thêm</h2>
        <div className="relative swiper-related-product">
          <Swiper
            modules={[Navigation, Pagination]}
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
                slidesPerView: 4,
              },
            }}
            className="!static"
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <CardProduct item={product} />
              </SwiperSlide>
            ))}

            {/* Custom Navigation Buttons */}
            <button className="swiper-btn-prev absolute -left-12 top-[117px] -translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div>
                <Arrow />
              </div>
            </button>
            <button className="swiper-btn-next absolute -right-12 top-[117px] translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div className="-rotate-180">
                <Arrow />
              </div>
            </button>
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default SectionSliderPost;
