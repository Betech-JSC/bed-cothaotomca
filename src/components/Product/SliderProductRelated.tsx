'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CardProduct from '../Card/CardProduct';
import Arrow from '../Icons/Arrow';
import { useTranslations } from 'next-intl';

interface SliderProductRelatedProps {
  products: any[];
}

const SliderProductRelated: React.FC<SliderProductRelatedProps> = ({ products }) => {
  const t = useTranslations();
  return (
    <section className='relative overflow-hidden bg-transparent md:py-[56px] py-[30px] xl:py-[60px]'>
      <div className="md:container md:space-y-6 space-y-8 xl:space-y-8">
        <h2 className="display-3 text-center text-primary">{t('product.explore-more')}</h2>
        <div className="relative swiper-related-product">
          <Swiper
            modules={[Navigation]}
            spaceBetween={24}
            slidesPerView={1}
            loop={products.length > 1}
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
                centeredSlides: true,
              },
              640: {
                slidesPerView: 2,
                spaceBetween: 16,
                centeredSlides: false,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 16,
                centeredSlides: false,
              },
              1280: {
                slidesPerView: 4,
                spaceBetween: 24,
                centeredSlides: false,
              },
            }}
            className="!static"
          >
            {products.map((product) => (
              <SwiperSlide key={product.id} className="!h-auto flex">
                <CardProduct item={product} />
              </SwiperSlide>
            ))}

            {/* Custom Navigation Buttons */}
            <button aria-label={t("common.previous") || "Trước"} className="swiper-btn-prev absolute left-2 xl:left-4 top-[117px] z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
              <div>
                <Arrow />
              </div>
            </button>
            <button aria-label={t("common.next") || "Tiếp theo"} className="swiper-btn-next absolute right-2 xl:right-4 top-[117px] z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
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
