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
    custom_name?: string;
    slug: string;
    price?: number | string;
    min_price?: number | string;
    variants?: any[];
    category: {
      title: string;
      id: string;
      slug: string; // Added slug back
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

  const getPrice = () => {
    const vPrice = parseFloat(String(item.variants?.[0]?.price || 0));
    if (vPrice > 0) return vPrice;

    const itemPrice = parseFloat(String(item.price || 0));
    if (itemPrice > 0) return itemPrice;

    const minPrice = parseFloat(String(item.min_price || 0));
    if (minPrice > 0) return minPrice;

    return 0;
  };

  const price = getPrice();

  return (
    <div className="group rounded-[24px] relative overflow-hidden bg-white h-full flex flex-col w-full shadow-sm">
      {/* Campaign Discount Badge */}
      {((item as any).active_campaign || ((item as any).original_price && parseFloat(String((item as any).original_price)) > price)) && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-[0.6875rem] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <span>🔥</span>
          <span>
            {(item as any).active_campaign?.discount_percent
              ? `-${(item as any).active_campaign.discount_percent}%`
              : (item as any).original_price
              ? `-${Math.round((((item as any).original_price - price) / (item as any).original_price) * 100)}%`
              : 'KHUYẾN MÃI'}
          </span>
        </div>
      )}

      {/* Image */}
      <Link
        href={{ pathname: '/product/[category]/[slug]', params: { category: item.category?.slug || item.category?.id || 'san-pham', slug: item.slug } }}
        className="block shrink-0"
      >
        <div className="aspect-square w-full relative overflow-hidden">
          <Image
            src={imageSrc}
            alt={item.image?.alt || item.title}
            priority={false}
            fill
            className="h-full w-full object-cover duration-500 ease-in-out lg:group-hover:scale-110"
          />
        </div>
      </Link>

      <div className="pt-2.5 pb-3 md:pt-3 md:pb-4 px-2 md:px-4 text-center flex flex-col flex-1 justify-between">
        <div>
          <Link
            href={{ pathname: '/product/[category]/[slug]', params: { category: item.category?.slug || item.category?.id || 'san-pham', slug: item.slug } }}
            className="flex items-center justify-center min-h-[58px] md:min-h-[64px]"
          >
            <h3 className="title-1 max-md:text-[22px] text-primary lg:group-hover:text-secondary duration-300 ease-in-out line-clamp-2 whitespace-pre-line">
              {item.custom_name || item.title}
            </h3>
          </Link>
          <div className="body-2 text-gray-900 line-clamp-2 min-h-[38px] md:min-h-[40px] mt-1 mb-2 flex items-center justify-center">
            <span>{item.description}</span>
          </div>
        </div>
        <div className="mt-auto pt-2 flex items-center justify-center gap-1.5">
          {item.variants && item.variants.length > 1 ? <span className="body-0 text-gray-900">{t('common.only_from')}</span> : null}
          <span className="text-[1.125rem] font-display font-bold text-secondary">
            {formatPrice(price)}
          </span>
          {(item as any).original_price && parseFloat(String((item as any).original_price)) > price && (
            <span className="text-gray-400 line-through text-sm">
              {formatPrice(parseFloat(String((item as any).original_price)))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardProduct;

