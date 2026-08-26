"use client";

import { useState } from "react";
import { formatPrice, formatRichTextContent } from "@/lib/format";
import BoxMessage from "@/components/Icons/BoxMessage";
import SocialShare from "@/components/SocialShare";
import ProductInfoAccordion from "@/components/Product/ProductInfoAccordion";
import { useTranslations } from "next-intl";
// import { useRouter } from "@/i18n/routing";
import type { ProductDetailView } from "@/services/productService";

import { useCart } from "@/contexts/CartContext";

interface ProductDetailsInfoProps {
  productData: ProductDetailView;
}

const ProductDetailsInfo = ({ productData }: ProductDetailsInfoProps) => {
  const t = useTranslations();
  // const router = useRouter();
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
      originalPrice: selectedSize.original_price,
    }, quantity);

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };


  return (
    <div className="relative top-0 md:space-y-8 space-y-6 xl:space-y-12">
      <div className="space-y-4">
        <div className="space-y-3 flex flex-col items-start">
          <h1 className="headline-1 max-md:text-[24px] text-primary whitespace-pre-line">
            {productData.title}
          </h1>
        </div>

        <div
          className="prose-content max-w-full"
          dangerouslySetInnerHTML={{ __html: formatRichTextContent(productData.description) }}
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
                    className={`w-max px-3 min-w-[48px] min-h[48px] flex items-center justify-center button-1 size-12 rounded-full duration-300 ease-in-out cursor-pointer ${selectedSizeIndex === index
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
          <div className="flex flex-col items-start gap-1 py-1">
            {selectedSize.original_price && selectedSize.original_price > selectedSize.price ? (
              <span className="inline-block bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-[4px] tracking-wide">
                -{(selectedSize as any).discount_percent || Math.round(((selectedSize.original_price - selectedSize.price) / selectedSize.original_price) * 100)}%
              </span>
            ) : null}
            <div className="text-2xl md:text-[28px] font-display font-bold text-secondary leading-tight">
              {formatPrice(selectedSize.price)}
            </div>
            {selectedSize.original_price && selectedSize.original_price > selectedSize.price ? (
              <div className="text-sm md:text-base font-semibold text-gray-400 line-through leading-tight">
                {formatPrice(selectedSize.original_price)}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Bộ chọn số lượng */}
        <div className="flex items-center gap-4 py-1">
          <span className="label-1 font-semibold text-gray-900 flex-shrink-0">
            {t("checkout.quantity")}:
          </span>
          <div className="flex items-center border border-gray-300 rounded-full overflow-hidden h-11 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-11 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 text-lg transition-colors border-r border-gray-300"
            >
              -
            </button>
            <span className="w-12 h-full flex items-center justify-center font-bold text-gray-900 text-base">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-11 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 text-lg transition-colors border-l border-gray-300"
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
                className={`btn flex items-center justify-center gap-2 ${hasCode
                  ? "btn-primary"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed border-none"
                  }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{hasCode ? t("button.add_to_cart") : t("product.out_of_stock")}</span>
              </button>
            );
          })()}

          {(() => {
            const hasCode = Boolean(selectedSize?.code);
            return (
              <button
                type="button"
                disabled={!hasCode}
                onClick={() => {
                  if (hasCode) {
                    handleAddToCart();
                    window.location.href = "/checkout";
                  }
                }}
                className={`btn flex items-center justify-center gap-2 ${hasCode
                  ? "btn-secondary font-bold"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed border-none"
                  }`}
              >
                <span>{t("button.buy-now")}</span>
              </button>
            );
          })()}
        </div>

        {isAdded && (
          <div className="text-secondary font-semibold text-sm flex items-center gap-1.5 animate-fade-in py-1">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{t("product.added_to_cart_success")}</span>
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
