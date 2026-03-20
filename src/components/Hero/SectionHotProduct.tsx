'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CardProduct from '../Card/CardProduct';
import Arrow from '../Icons/Arrow';
import Image from 'next/image';

interface SectionHotProductProps {
  products: any[];
}

const SectionHotProduct: React.FC<SectionHotProductProps> = ({ products }) => {
  return (
    <section className='relative md:py-[56px] py-12 xl:py-[60px]'>
      <div className="absolute inset-0">
        <Image
          src="/images/home/bg-hot-product.png"
          alt="background hot product"
          fill
          className="object-cover w-full h-full"
        />
      </div>
      <div className="relative">
        <div className="container space-y-8">
          <h2 className="display-2 text-center text-primary uppercase">Sản phẩm bán chạy</h2>
          <div className="relative swiper-hot-product">
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
              centeredSlides={true}
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
                  slidesPerView: 3,
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
      </div>
    </section>
  );
};

export default SectionHotProduct;
