'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CardProduct from '../Card/CardProduct';
import Arrow from '../Icons/Arrow';

interface SliderProductRelatedProps {
  products: any[];
}

const SliderProductRelated: React.FC<SliderProductRelatedProps> = ({ products }) => {
  return (
    <section className='bg-yellow md:py-[56px] py-12 xl:py-[60px]'>
      <div className="md:container max-md:pl-4 md:space-y-6 space-y-4 xl:space-y-8">
        <h2 className="display-3 text-center text-primary">Khám Phá Thêm</h2>
        <div className="relative swiper-related-product">
          <Swiper
            modules={[Navigation]}
            spaceBetween={24}
            slidesPerView={1}
            loop
            navigation={{
              prevEl: '.swiper-btn-prev',
              nextEl: '.swiper-btn-next',
            }}
            pagination={{
              clickable: true,
            }}
            breakpoints={{
              320: {
                slidesPerView: 1.4,
                spaceBetween: 14,
              },
              640: {
                slidesPerView: 2,
                spaceBetween: 16,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 16,
              },
              1280: {
                slidesPerView: 4,
                spaceBetween: 24,
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
      </div>
    </section>
  );
};

export default SliderProductRelated;
