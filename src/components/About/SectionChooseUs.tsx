'use client'

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface SectionChooseUsProps {
  items: any[];
}

const SectionChooseUs: React.FC<SectionChooseUsProps> = ({ items }) => {
  return (
    <section className="relative h-[600px] md:h-[550px] xl:h-[810px]">
      <div className="relative swiper-choose-us h-full">
        <Swiper
          modules={[]}
          spaceBetween={0}
          slidesPerView={1}
          navigation={{
            prevEl: '.swiper-btn-prev',
            nextEl: '.swiper-btn-next',
          }}
          pagination={{
            clickable: true,
          }}
          className="!static h-full"
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
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
              <div className="bg-linear-chooseus max-w-[840px] w-full h-full absolute top-0 left-0 flex items-center">
                <div className="md:p-6 p-4 lg:p-10 xl:p-16 md:space-y-4 space-y-3 xl:space-y-6 max-w-[520px] xl:max-w-[560px] w-full">
                  <h3 className="display-2 max-md:text-[32px] text-yellow">{item.title}</h3>
                  <p className="body-1 text-white">{item.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section >
  );
};

export default SectionChooseUs;
