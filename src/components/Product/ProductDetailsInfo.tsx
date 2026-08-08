"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import BoxMessage from "@/components/Icons/BoxMessage";
import SocialShare from "@/components/SocialShare";
import ProductInfoAccordion from "@/components/Product/ProductInfoAccordion";
import { useTranslations } from "next-intl";
import SliderProductImages from "@/components/Product/SliderProductImages";
import { useRouter } from "@/i18n/routing";
import type { ProductDetailView } from "@/services/productService";

import { useCart } from "@/contexts/CartContext";

interface ProductDetailsInfoProps {
  productData: ProductDetailView;
}

const ProductDetailsInfo = ({ productData }: ProductDetailsInfoProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { addToCart } = useCart();

  const selectedSize = productData.sizes[selectedSizeIndex];

  const handleAddToCart = () => {
    addToCart({
      id: `${productData.checkout.slug}-${selectedSize.title}`,
      productId: selectedSize.id ?? productData.checkout.productId,
      productCode: selectedSize.code ?? productData.checkout.productCode,
      slug: productData.checkout.slug,
      categorySlug: productData.checkout.categorySlug,
      title: productData.title,
      imageUrl: productData.images[0]?.url || "/cover.jpg",
      variant: selectedSize.title,
      unitPrice: selectedSize.price,
    }, quantity);
    
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <div className="relative top-0 md:space-y-8 space-y-6 xl:space-y-12">
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-3 flex flex-col items-start">
          <h1 className="headline-1 max-md:text-[24px] text-primary whitespace-pre-line">
            {productData.title}
          </h1>
          {productData.images.length > 0 && (
            <div className="mb-6 md:hidden w-full">
              <SliderProductImages items={productData.images} />
            </div>
          )}
        </div>

        <div
          className="body-1 text-gray-900"
          dangerouslySetInnerHTML={{ __html: productData.description }}
        />

        {productData.sizes.length > 1 ? (
          <div className="flex md:flex-row flex-col items-start md:gap-4 gap-3 xl:gap-6">
            <div className="label-1 font-semibold text-gray-900 flex-shrink-0 md:mt-3">
              {productData.variant_type?.toLowerCase() === "volume"
                ? t("product.volume")
                : productData.variant_type?.toLowerCase() === "type"
                  ? t("product.type")
                  : t("product.size")}
            </div>
            <div className="flex-1 w-full">
              <div className="flex items-center flex-wrap md:gap-4 gap-3 xl:gap-3">
                {productData.sizes.map((size, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedSizeIndex(index)}
                    className={`w-max px-3 min-w-[48px] min-h[48px] flex items-center justify-center button-1 size-12 rounded-full duration-300 ease-in-out cursor-pointer ${
                      selectedSizeIndex === index
                        ? "bg-primary text-yellow"
                        : "bg-white text-gray-900 lg:hover:bg-primary lg:hover:text-yellow"
                    }`}
                  >
                    <span>{size.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {selectedSize.price > 0 ? (
          <div className="title-1 text-secondary">
            {formatPrice(selectedSize.price)}
          </div>
        ) : null}

        {/* Bộ chọn số lượng */}
        <div className="flex items-center gap-4 py-1">
          <span className="label-1 font-semibold text-gray-900 flex-shrink-0">
            Số lượng:
          </span>
          <div className="flex items-center border border-[#B9C0D4] rounded-full overflow-hidden h-11 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-11 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 text-lg transition-colors border-r border-[#B9C0D4]"
            >
              -
            </button>
            <span className="w-12 h-full flex items-center justify-center font-bold text-gray-900 text-base">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-11 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 text-lg transition-colors border-l border-[#B9C0D4]"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(() => {
            const hasCode = Boolean(selectedSize?.code);
            return (
              <button
                type="button"
                disabled={!hasCode}
                onClick={handleAddToCart}
                className={`btn flex items-center justify-center gap-2 ${
                  hasCode
                    ? "btn-primary"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed border-none"
                }`}
              >
                <BoxMessage />
                <span>{hasCode ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}</span>
              </button>
            );
          })()}


          <a
            href="https://m.me/cothaotomca"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn btn-secondary flex items-center justify-center"
          >
            <span>{t("product.contact")}</span>
          </a>
        </div>

        {isAdded && (
          <div className="text-green-600 font-semibold text-sm flex items-center gap-1.5 animate-fade-in py-1">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Đã thêm vào giỏ hàng thành công!</span>
          </div>
        )}

        <SocialShare />
      </div>
      {productData.infos.length > 0 && (
        <ProductInfoAccordion infos={productData.infos} />
      )}
    </div>
  );
};

export default ProductDetailsInfo;
