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
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return {
    title: isEn ? 'Checkout | Co Thao Tom Ca' : 'Thanh toán | Cô Thảo Tôm Cá',
    robots: { index: false, follow: false },
  }
}

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
      id: 1333367,
      branchName: "Chi nhánh Trần Đình Xu (Q.1)",
      address: "42/2 Trần Đình Xu, Cô Giang, Quận 1 (Takeaway)",
      contactNumber: "024.9999.7122",
      isActive: true,
    },
    {
      id: 1000021173,
      branchName: "Chi nhánh Tân Bình",
      address: "39 Thân Nhân Trung, P.13, Tân Bình (Takeaway)",
      contactNumber: "024.9999.7122",
      isActive: true,
    },
    {
      id: 1363270,
      branchName: "Chi nhánh TP. Thủ Đức",
      address: "69A Trương Văn Thành, Hiệp Phú, Thủ Đức (Takeaway)",
      contactNumber: "024.9999.7122",
      isActive: true,
    },
    {
      id: 1000000211,
      branchName: "Chi nhánh Hoàng Sa (Q.1)",
      address: "197 Hoàng Sa, Tân Định, Quận 1 (Takeaway)",
      contactNumber: "024.9999.7122",
      isActive: true,
    },
    {
      id: 1000021387,
      branchName: "Chi nhánh Gò Vấp",
      address: "1073 Phan Văn Trị, Gò Vấp (Takeaway)",
      contactNumber: "024.9999.7122",
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
      originalPrice: matchedSize.original_price,
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
