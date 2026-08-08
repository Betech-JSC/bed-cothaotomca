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
      id: 916323,
      branchName: "Chi nhánh trung tâm",
      address: "73 Rạch Bùng Binh, Phường 14, Quận 3, Hồ Chí Minh",
      contactNumber: "+84775600351",
      isActive: true,
    },
  ],
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { slug, category, variant, price } = await searchParams;
  const t = await getTranslations({ locale });

  const [product, config] = await Promise.all([
    slug
      ? getProductBySlugWithFallback(slug, { lang: locale, revalidate: 0 })
      : Promise.resolve(null),
    getCheckoutConfig().catch((err) => {
      console.error("❌ [CheckoutPage] Failed to fetch checkout config from backend API:", err);
      return defaultConfig;
    }),
  ]);

  console.log("ℹ️ [CheckoutPage] Branches list fetched from backend:", config?.branches);

  if (!product && slug) {
    notFound();
  }

  let order = null;
  if (product) {
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

    order = {
      productId: matchedSize.id ?? product.id,
      productCode: matchedSize.code ?? productData.checkout.productCode,
      slug: productData.checkout.slug,
      categorySlug: productData.checkout.categorySlug,
      title: productData.title,
      imageUrl: productData.images[0]?.url || "/cover.jpg",
      variant: matchedSize.title,
      unitPrice,
    };
  }

  const breadcrumbs = [
    { title: t("breadcrumb.product"), url: "/product" as const },
    ...(order
      ? [
        {
          title: order.title,
          url: {
            pathname: "/product/[category]/[slug]" as const,
            params: {
              category: order.categorySlug,
              slug: order.slug,
            },
          },
        },
      ]
      : []),
    { title: t("checkout.title") },
  ];

  return (
    <main className="py-6 md:py-14 xl:py-16">
      <div className="lg:container max-lg:px-4 space-y-8">
        <CheckoutForm order={order} config={config} />
      </div>
    </main>
  );
}
