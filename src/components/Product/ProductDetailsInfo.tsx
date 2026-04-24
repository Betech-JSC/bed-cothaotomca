'use client'

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import BoxMessage from "@/components/Icons/BoxMessage";
import SocialShare from "@/components/SocialShare";
import ProductInfoAccordion from "@/components/Product/ProductInfoAccordion";
import { useTranslations } from "next-intl";
import SliderProductImages from "@/components/Product/SliderProductImages";

interface ProductDetailsInfoProps {
  productData: {
    title: string;
    description: string;
    images: any[];
    sizes: { title: string; price: number }[];
    infos: { title: string; content: string }[];
  };
}

const ProductDetailsInfo = ({ productData }: ProductDetailsInfoProps) => {
  const t = useTranslations();
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);

  const selectedSize = productData.sizes[selectedSizeIndex];

  return (
    <div className="relative top-0 md:space-y-8 space-y-6 xl:space-y-12">
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-3 flex flex-col items-start">
          <h1 className="headline-1 max-md:text-[24px] text-primary">{productData.title}</h1>
          {productData.images.length > 0 && (
            <div className="mb-6 md:hidden w-full">
              <SliderProductImages items={productData.images} />
            </div>
          )}
        </div>

        <div className="body-1 text-gray-900" dangerouslySetInnerHTML={{ __html: productData.description }} />

        <div className="flex items-start md:gap-4 gap-3 xl:gap-6">
          <div className="label-1 font-semibold text-gray-900 flex-shrink-0 mt-3">{t('product.size')}</div>
          <div className="flex-1 w-full">
            {productData.sizes.length > 1 && (
              <div className="flex items-center flex-wrap md:gap-4 gap-3 xl:gap-6">
                {productData.sizes.map((size, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedSizeIndex(index)}
                    className={`w-max px-3 min-w-[48px] min-h[48px] flex items-center justify-center button-1 size-12 rounded-full duration-300 ease-in-out cursor-pointer ${selectedSizeIndex === index
                      ? "bg-primary text-yellow"
                      : "bg-white text-gray-900 lg:hover:bg-primary lg:hover:text-yellow"
                      }`}
                  >
                    <span>{size.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="title-1 text-secondary">{formatPrice(selectedSize.price)}</div>

        <div className="grid grid-cols-2 gap-3">
          <a href="https://m.me/cothaotomca" target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary flex items-center justify-center gap-2">
            <BoxMessage />
            <span>{t('product.buy_now')}</span>
          </a>
          <a href="https://m.me/cothaotomca" target="_blank" rel="noopener noreferrer nofollow" className="btn btn-secondary">
            <span>{t('product.contact')}</span>
          </a>
        </div>

        <SocialShare />
      </div>
      {productData.infos.length > 0 && <ProductInfoAccordion infos={productData.infos} />}
    </div>
  );
};

export default ProductDetailsInfo;
