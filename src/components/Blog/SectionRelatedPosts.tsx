'use client'

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/i18n-navigation';
import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../Animated/animated-appear';

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
    <section className="bg-transparent py-12 md:py-16 xl:py-20">
      <div className="container">
        <AnimateOnScroll animate="slideup" delay={0}>
          <h2 className="display-3 max-md:text-[28px] text-center text-primary mb-8 md:mb-12">
            {t('blog.related_posts')}
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-6 xl:gap-8">
          {items.slice(0, 4).map((item, index) => (
            <AnimateOnScroll key={index} animate="slideup" delay={index * 100}>
              <article className="group space-y-3">
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

                <div>
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
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectionRelatedPosts;
