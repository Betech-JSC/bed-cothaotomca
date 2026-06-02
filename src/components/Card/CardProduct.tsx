'use client'

import Image from "next/image";
import { Link } from "@/i18n/routing";
import React from "react";
import { formatPrice } from "@/lib/format";
import { useTranslations } from "next-intl";

interface CardProductProps {
  item: {
    id: number;
    title: string;
    slug: string;
    price?: number;
    variants?: any[];
    category: {
      title: string;
      id: string;
      slug: string;
    };
    image: {
      url: string;
      alt?: string;
    };
    description: string;
    created_at: string;
  };
  isHot?: boolean;
}

const CardProduct: React.FC<CardProductProps> = ({ item, isHot }) => {
  const t = useTranslations();
  const imageSrc = item.image?.url || '/cover.jpg';
  const variants = item.variants ?? [];
  const unitPrice =
    variants.length > 0
      ? parseFloat(String(variants[0]?.price)) || 0
      : (item.price ?? 0);
  const showPrice = unitPrice > 0;
  const categorySlug = item.category.slug || item.category.id || 'san-pham';

  return (
    <div className="group rounded-[24px] relative overflow-hidden bg-white">
      <Link
        href={{ pathname: '/product/[category]/[slug]', params: { category: categorySlug, slug: item.slug } }}
        className="block"
      >
        <div className="aspect-w-1 aspect-h-1 relative overflow-hidden">
          {isHot ? (
            <span className="absolute top-3 left-3 z-10 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-yellow">
              Hot
            </span>
          ) : null}
          <Image
            src={imageSrc}
            alt={item.image?.alt || item.title}
            priority={false}
            fill
            className="h-full w-full object-cover duration-500 ease-in-out lg:group-hover:scale-110"
          />
        </div>
      </Link>

      <div className="py-3 md:py-6 px-2 md:px-4 text-center">
        <Link
          href={{ pathname: '/product/[category]/[slug]', params: { category: categorySlug, slug: item.slug } }}
          className="block"
        >
          <h3 className={`title-1 max-md:text-[16px] text-primary lg:group-hover:text-secondary duration-300 ease-in-out line-clamp-1 min-h-[24px] md:min-h-[32px]`}>
            {item.title}
          </h3>
        </Link>
        <div className="body-1 text-gray-900 line-clamp-3 min-h-[72px] mt-1.5 mb-3">{item.description}</div>
        {showPrice ? (
          <div className="flex items-center justify-center gap-1.5">
            {variants.length > 1 ? (
              <span className="body-0 text-gray-900">{t('common.only_from')}</span>
            ) : null}
            <span className="title-2 text-secondary">{formatPrice(unitPrice)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CardProduct;
