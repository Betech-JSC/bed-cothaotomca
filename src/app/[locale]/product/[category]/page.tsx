import ProductIndexPage from "@/components/Product/ProductIndexPage";
import { getApi } from "@/services/apiService";
import { getProductCatalog } from "@/services/productService";
import { getCategories, getCategorySlug } from "@/services/categoryService";
import { getIngredients } from "@/services/ingredientService";
import { HeroBanner } from "@/services/heroBannerService";
import Banner from "@/components/Banner";

const PAGE_SIZE = 9;

interface Props {
  params: Promise<{
    locale: string;
    category: string;
  }>;
  searchParams: Promise<{
    ingredients?: string;
    page?: string;
  }>;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category: categorySlug } = await params;
  const { ingredients: ingredientsParam, page = "1" } = await searchParams;
  const currentPage = Math.max(1, Number(page));

  const [categoriesResp, ingredientsResp, bannerResp, catalog] =
    await Promise.all([
      getCategories({ lang: locale }).catch(() => ({ data: [] })),
      getIngredients(locale).catch(() => ({ data: [] })),
      getApi<HeroBanner>("banners", {
        params: { position: "banner_product", lang: locale },
      }).catch(() => ({ data: [] })),
      getProductCatalog(locale).catch(() => []),
    ]);

  const categories = categoriesResp.data;
  const ingredients = ingredientsResp.data;

  const categoryExists = categories.some(
    (cat) => getCategorySlug(cat, locale) === categorySlug,
  );

  const selectedIngredientsSlugs = ingredientsParam
    ? ingredientsParam.split(",").filter(Boolean)
    : [];

  const bannerItem = bannerResp.data[0];
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

  if (categorySlug && !categoryExists) {
    return (
      <main>
        <Banner banner={banner} />
        <ProductIndexPage
          category={categorySlug}
          selectedIngredients={[]}
          products={[]}
          categories={categories}
          ingredients={ingredients}
          locale={locale}
          clientSidePagination
          pagination={{ currentPage: 1, lastPage: 1, total: 0 }}
        />
      </main>
    );
  }

  return (
    <main>
      <Banner banner={banner} />
      <ProductIndexPage
        category={categorySlug}
        selectedIngredients={selectedIngredientsSlugs}
        products={catalog}
        categories={categories}
        ingredients={ingredients}
        locale={locale}
        clientSidePagination
        pagination={{
          currentPage,
          lastPage: Math.max(1, Math.ceil(catalog.length / PAGE_SIZE)),
          total: catalog.length,
        }}
      />
    </main>
  );
}
