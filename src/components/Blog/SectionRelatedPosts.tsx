'use client'

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/i18n-navigation';
import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../Animated/animated-appear';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Arrow from '../Icons/Arrow';

export interface RelatedPostItem {
  image: {
    url: string;
    alt?: string;
  };
  title: string;
  slug: string;
  category: {
    title: string;
    slug: string;
  };
  created_at?: string;
}

interface SectionRelatedPostsProps {
  items: RelatedPostItem[];
}

const SectionRelatedPosts: React.FC<SectionRelatedPostsProps> = ({ items }) => {
  const t = useTranslations();

  if (!items || items.length === 0) return null;

  return (
    <section className="bg-transparent py-12 md:py-16 xl:py-20 relative overflow-hidden">
      <div className="container">
        <AnimateOnScroll animate="slideup" delay={0}>
          <h2 className="display-3 max-md:text-[28px] text-center text-primary mb-8 md:mb-12">
            {t('blog.related_posts')}
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll animate="slideup" delay={100}>
          <div className="relative swiper-related-posts">
            <Swiper
              modules={[Navigation]}
              spaceBetween={16}
              slidesPerView={1.25}
              loop={false}
              navigation={{
                prevEl: '.swiper-related-btn-prev',
                nextEl: '.swiper-related-btn-next',
              }}
              breakpoints={{
                480: {
                  slidesPerView: 1.5,
                  spaceBetween: 16,
                },
                640: {
                  slidesPerView: 2,
                  spaceBetween: 20,
                },
                1024: {
                  slidesPerView: 3,
                  spaceBetween: 24,
                },
                1280: {
                  slidesPerView: 4,
                  spaceBetween: 24,
                },
              }}
              className="!static"
            >
              {items.map((item, index) => (
                <SwiperSlide key={index} className="!h-auto flex">
                  <article className="group flex flex-col w-full space-y-3">
                    <Link
                      href={{
                        pathname: '/blog/category/[category]/[slug]',
                        params: { category: item.category.slug, slug: item.slug },
                      }}
                      className="block"
                      aria-label={item.title}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px]">
                        <Image
                          src={item.image.url || '/cover.jpg'}
                          alt={item.image.alt || item.title}
                          fill
                          className="object-cover w-full h-full duration-300 ease-in-out group-hover:scale-105"
                        />
                      </div>
                    </Link>

                    <div className="flex-1">
                      <Link
                        href={{
                          pathname: '/blog/category/[category]/[slug]',
                          params: { category: item.category.slug, slug: item.slug },
                        }}
                        className="block"
                      >
                        <h3 className="title-2 text-primary group-hover:text-secondary duration-300 ease-in-out line-clamp-2 font-bold leading-snug">
                          {item.title}
                        </h3>
                      </Link>
                    </div>
                  </article>
                </SwiperSlide>
              ))}

              {/* Custom Navigation Buttons */}
              <button
                aria-label={t('common.previous') || 'Trước'}
                className="swiper-related-btn-prev absolute left-0 xl:-left-12 top-[100px] md:top-[120px] -translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <div>
                  <Arrow />
                </div>
              </button>
              <button
                aria-label={t('common.next') || 'Tiếp theo'}
                className="swiper-related-btn-next absolute right-0 xl:-right-12 top-[100px] md:top-[120px] translate-x-1/2 z-10 size-[52px] rounded-full bg-white shadow-lg hidden md:flex items-center justify-center text-gray-900 border border-gray-100 transition-all duration-300 lg:hover:bg-primary lg:hover:text-yellow disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <div className="-rotate-180">
                  <Arrow />
                </div>
              </button>
            </Swiper>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default SectionRelatedPosts;
