import { HeroBanner } from "@/services/heroBannerService";
import Banner from "@/components/Banner";
import ProductIndexPage from "@/components/Product/ProductIndexPage";
import { getProductCatalog } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { getIngredients } from "@/services/ingredientService";
import { getApi } from "@/services/apiService";

const PAGE_SIZE = 9;

interface Props {
  params: Promise<{
    locale: string;
    category?: string;
  }>;
  searchParams: Promise<{
    ingredients?: string;
    page?: string;
  }>;
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ingredients: ingredientsParam, page = "1" } = await searchParams;
  const currentPage = Math.max(1, Number(page));

  const selectedIngredients = ingredientsParam
    ? ingredientsParam.split(",").filter(Boolean)
    : [];

  const [ingredientsData, categoriesData, bannerData, catalog] =
    await Promise.all([
      getIngredients(locale).catch(() => ({ data: [] })),
      getCategories({ lang: locale }).catch(() => ({ data: [] })),
      getApi<HeroBanner>("banners", {
        params: { position: "banner_product", lang: locale },
      }).catch(() => ({ data: [] })),
      getProductCatalog(locale).catch(() => []),
    ]);

  const bannerItem = bannerData.data[0];
  const banner = {
    image: {
      url: bannerItem?.image || "/images/demo/banner-product.jpg",
      alt: bannerItem?.title || "banner product",
    },
    image_mobile: {
      url:
        bannerItem?.image_mobile ||
        bannerItem?.image ||
        "/images/demo/banner-product.jpg",
      alt: bannerItem?.title || "banner product",
    },
  };

  const lastPage = Math.max(1, Math.ceil(catalog.length / PAGE_SIZE));

  return (
    <main>
      <Banner banner={banner} />
      <ProductIndexPage
        category={null}
        selectedIngredients={selectedIngredients}
        products={catalog}
        categories={categoriesData.data}
        ingredients={ingredientsData.data}
        locale={locale}
        pagination={{
          currentPage: Math.min(currentPage, lastPage),
          lastPage,
          total: catalog.length,
        }}
      />
    </main>
  );
}
