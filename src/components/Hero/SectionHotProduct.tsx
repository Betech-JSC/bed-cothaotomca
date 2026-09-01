'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CardProduct from '../Card/CardProduct';
import Arrow from '../Icons/Arrow';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/i18n-navigation';
import Cart from '../Icons/Cart';
import AnimateOnScroll from '../Animated/animated-appear';

interface SectionHotProductProps {
  products: any[];
}

const SectionHotProduct: React.FC<SectionHotProductProps> = ({ products }) => {
  const t = useTranslations();

  return (
    <section className='relative overflow-hidden md:py-[3.5rem] pt-[2.375rem] pb-[3.75rem] xl:pt-[3.75rem] xl:pb-[18.75rem]'>
      <div className="absolute inset-0">
        <Image
          src="/images/home/bg-hot-product.png"
          alt="background hot product"
          fill
          className="object-cover w-full h-full"
        />
      </div>
      <div className="relative">
        <div className="md:container md:space-y-6 space-y-8 xl:space-y-8">
          <AnimateOnScroll animate="slideup" delay={300}>
            <h2 className="display-2 max-md:text-[1.75rem] text-center text-primary uppercase">{t('home.section-4.title')}</h2>
          </AnimateOnScroll>
          <div className="relative swiper-hot-product">
            <Swiper
              modules={[Navigation]}
              spaceBetween={24}
              slidesPerView={3}
              loop={products.length > 1}
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
                  slidesPerView: 1.3,
                  spaceBetween: 8,
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
              {products.map((product, index) => (
                <SwiperSlide key={product.id} className="!h-auto flex">
                  <AnimateOnScroll animate="slideup" delay={300} className="h-full w-full">
                    <CardProduct item={product} />
                  </AnimateOnScroll>
                </SwiperSlide>
              ))}

              <button aria-label="Previous Product" className="swiper-btn-prev absolute left-0 xl:-left-12 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 size-[3.25rem] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
                <div>
                  <Arrow />
                </div>
              </button>
              <button aria-label="Next Product" className="swiper-btn-next absolute right-0 xl:-right-12 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 size-[3.25rem] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer">
                <div className="-rotate-180">
                  <Arrow />
                </div>
              </button>
            </Swiper>
          </div>
          <div className="flex justify-center">
            <Link href="/product" className="btn btn-primary gap-2 max-md:!px-[4.5rem]">
              <Cart />
              <span>{t('button.order-now')}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionHotProduct;
