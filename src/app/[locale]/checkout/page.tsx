import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import Breadcrumb from "@/components/Common/Breadcrumb";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import { getTranslations } from "next-intl/server";
import { getCheckoutConfig } from "@/services/orderService";
import {
  getProductBySlugWithFallback,
  mapProductToDetailView,
} from "@/services/productService";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    slug?: string;
    category?: string;
    variant?: string;
    price?: string;
  }>;
}

const defaultConfig = {
  delivery_types: [
    { value: "delivery" as const, label: "Giao hàng" },
    { value: "pickup" as const, label: "Tự đến lấy" },
  ],
  default_shipping_fee: "30000",
  branches: [
    {
      id: 1,
      branchName: "Bếp Cô Thảo - Cầu Giấy",
      address: "Số 12 Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội",
      contactNumber: "024.9999.7122",
      isActive: true,
    },
    {
      id: 2,
      branchName: "Bếp Cô Thảo - Đống Đa",
      address: "Số 34 Chùa Bộc, Quận Đống Đa, Hà Nội",
      contactNumber: "024.9999.7123",
      isActive: true,
    },
  ],
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { slug, category, variant, price } = await searchParams;
  const t = await getTranslations({ locale });

  if (!slug || !category) {
    redirect({ href: "/product", locale: locale as "vi" | "en" });
  }

  const [product, config] = await Promise.all([
    getProductBySlugWithFallback(slug, { lang: locale, revalidate: 0 }),
    getCheckoutConfig().catch((err) => {
      console.error("❌ [CheckoutPage] Failed to fetch checkout config from backend API:", err);
      return defaultConfig;
    }),
  ]);

  console.log("ℹ️ [CheckoutPage] Branches list fetched from backend:", config?.branches);

  if (!product) {
    notFound();
  }

  const productData = mapProductToDetailView(product, locale, {
    standard: t("product.standard"),
  });

  const decodedVariant = variant ? decodeURIComponent(variant) : "";
  const matchedSize =
    productData.sizes.find((s) => s.title === decodedVariant) ??
    productData.sizes[0];

  const unitPrice =
    price && !Number.isNaN(Number(price))
      ? Number(price)
      : matchedSize.price;

  const order = {
    productId: product.id,
    productCode: productData.checkout.productCode,
    slug: productData.checkout.slug,
    categorySlug: productData.checkout.categorySlug,
    title: productData.title,
    imageUrl: productData.images[0]?.url || "/cover.jpg",
    variant: matchedSize.title,
    unitPrice,
  };

  const breadcrumbs = [
    { title: t("breadcrumb.product"), url: "/product" as const },
    {
      title: productData.title,
      url: {
        pathname: "/product/[category]/[slug]" as const,
        params: {
          category: order.categorySlug,
          slug: order.slug,
        },
      },
    },
    { title: t("checkout.title") },
  ];

  return (
    <main className="py-10 md:py-14 xl:py-16">
      <div className="container space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Breadcrumb breadcrumbs={breadcrumbs} />
          <h1 className="display-3 text-center text-primary">
            {t("checkout.title")}
          </h1>
          <p className="body-1 text-gray-700 text-center max-w-xl">
            {t("checkout.description")}
          </p>
        </div>
        <CheckoutForm order={order} config={config} />
      </div>
    </main>
  );
}
