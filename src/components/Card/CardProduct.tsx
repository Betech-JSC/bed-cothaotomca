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

  const pricing = React.useMemo(() => {
    // 0. If item already has price and original_price explicitly calculated from service
    const directPrice = parseFloat(String(item.price || (item as any).min_price || 0));
    const directOrigPrice = parseFloat(String((item as any).original_price || (item as any).originalPrice || 0));

    if (directPrice > 0 && directOrigPrice > directPrice) {
      const activeCamp = (item as any).active_campaign;
      const configuredPercent = activeCamp?.discount_type === 'percent' && Number(activeCamp.discount_value) > 0
        ? Math.round(Number(activeCamp.discount_value))
        : (activeCamp?.discount_percent ? Math.round(Number(activeCamp.discount_percent)) : 0);

      return {
        price: directPrice,
        originalPrice: directOrigPrice,
        hasDiscount: true,
        discountPercent: configuredPercent || Math.round(((directOrigPrice - directPrice) / directOrigPrice) * 100),
      };
    }

    // 1. If variants exist, find the variant with the lowest effective selling price
    if (item.variants && item.variants.length > 0) {
      let lowestEffectivePrice = Infinity;
      let matchingOriginalPrice: number | undefined = undefined;
      let matchingDiscountPercent = 0;

      item.variants.forEach((v: any) => {
        const basePrice = parseFloat(String(v.original_price || v.price || 0));
        if (basePrice <= 0) return;

        let campPrice: number | null = (v.campaign_price !== undefined && v.campaign_price !== null)
          ? parseFloat(String(v.campaign_price))
          : null;

        if (!campPrice && v.active_campaign) {
          campPrice = parseFloat(String(v.active_campaign.campaign_price || 0));
        }

        if (!campPrice && (item as any).active_campaign) {
          if (
            (item as any).active_campaign.discount_type === 'percent' &&
            Number((item as any).active_campaign.discount_value) > 0
          ) {
            campPrice = Math.round(basePrice * (1.0 - Number((item as any).active_campaign.discount_value) / 100.0));
          } else if (
            (item as any).active_campaign.discount_type === 'fixed' &&
            Number((item as any).active_campaign.discount_value) > 0
          ) {
            campPrice = Math.max(0, basePrice - Number((item as any).active_campaign.discount_value));
          } else if ((item as any).active_campaign.campaign_price) {
            campPrice = Number((item as any).active_campaign.campaign_price);
          }
        }

        const isDiscounted = campPrice !== null && campPrice > 0 && campPrice < basePrice;
        const effectivePrice = isDiscounted ? campPrice : basePrice;

        const activeCamp = (v as any).active_campaign || (item as any).active_campaign;
        const configuredPercent = activeCamp?.discount_type === 'percent' && Number(activeCamp.discount_value) > 0
          ? Math.round(Number(activeCamp.discount_value))
          : (activeCamp?.discount_percent ? Math.round(Number(activeCamp.discount_percent)) : 0);

        const calcPercent = isDiscounted ? Math.round(((basePrice - effectivePrice) / basePrice) * 100) : 0;
        const itemDiscountPercent = isDiscounted ? (configuredPercent || calcPercent) : 0;

        if (effectivePrice < lowestEffectivePrice) {
          lowestEffectivePrice = effectivePrice;
          matchingOriginalPrice = isDiscounted ? basePrice : undefined;
          matchingDiscountPercent = itemDiscountPercent;
        } else if (effectivePrice === lowestEffectivePrice && isDiscounted && !matchingOriginalPrice) {
          matchingOriginalPrice = basePrice;
          matchingDiscountPercent = itemDiscountPercent;
        }
      });

      if (lowestEffectivePrice < Infinity) {
        const hasDiscount = Boolean(matchingOriginalPrice && matchingOriginalPrice > lowestEffectivePrice);
        return {
          price: lowestEffectivePrice,
          originalPrice: matchingOriginalPrice,
          hasDiscount,
          discountPercent: hasDiscount ? matchingDiscountPercent : 0,
        };
      }
    }

    // 2. Fallback when no variants exist
    const basePrice = parseFloat(String((item as any).original_price || item.price || item.min_price || 0));
    let campPrice: number | null = (item as any).campaign_price !== undefined && (item as any).campaign_price !== null
      ? parseFloat(String((item as any).campaign_price))
      : null;

    if (!campPrice && (item as any).active_campaign && basePrice > 0) {
      if (
        (item as any).active_campaign.discount_type === 'percent' &&
        Number((item as any).active_campaign.discount_value) > 0
      ) {
        campPrice = Math.round(basePrice * (1.0 - Number((item as any).active_campaign.discount_value) / 100.0));
      } else if (
        (item as any).active_campaign.discount_type === 'fixed' &&
        Number((item as any).active_campaign.discount_value) > 0
      ) {
        campPrice = Math.max(0, basePrice - Number((item as any).active_campaign.discount_value));
      } else if ((item as any).active_campaign.campaign_price) {
        campPrice = Number((item as any).active_campaign.campaign_price);
      }
    }

    const isDiscounted = campPrice !== null && campPrice > 0 && campPrice < basePrice;
    const price = isDiscounted ? campPrice : (directPrice > 0 ? directPrice : basePrice);
    const originalPrice = isDiscounted ? basePrice : (directOrigPrice > price ? directOrigPrice : undefined);
    const hasDiscount = Boolean(originalPrice && originalPrice > price);
    
    const fallbackActiveCamp = (item as any).active_campaign;
    const fallbackConfiguredPercent = fallbackActiveCamp?.discount_type === 'percent' && Number(fallbackActiveCamp.discount_value) > 0
      ? Math.round(Number(fallbackActiveCamp.discount_value))
      : (fallbackActiveCamp?.discount_percent ? Math.round(Number(fallbackActiveCamp.discount_percent)) : 0);

    const discountPercent = hasDiscount
      ? (fallbackConfiguredPercent || Math.round(((originalPrice - price) / originalPrice) * 100))
      : (fallbackConfiguredPercent || 0);

    return {
      price,
      originalPrice,
      hasDiscount,
      discountPercent,
    };
  }, [item]);

  const { price, originalPrice, hasDiscount, discountPercent } = pricing;

  return (
    <div className="group rounded-[24px] relative overflow-hidden bg-white h-full flex flex-col w-full shadow-sm">
      {/* Campaign Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-3 left-3 z-10 bg-secondary text-white font-bold text-[0.6875rem] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center">
          <span>
            {discountPercent > 0
              ? `-${discountPercent}%`
              : (item as any).active_campaign?.discount_percent
                ? `-${(item as any).active_campaign.discount_percent}%`
                : (t("product.sale") || "PROMO")}
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
          <div className="body-1 text-gray-900 line-clamp-3 min-h-[48px] md:min-h-[72px] mt-1 mb-2">
            {item.description}
          </div>
        </div>
        <div className="mt-auto pt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="title-2 text-secondary">
            {formatPrice(price)}
          </span>
          {hasDiscount && originalPrice && (
            <span className="text-gray-400 line-through text-sm font-medium">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardProduct;

