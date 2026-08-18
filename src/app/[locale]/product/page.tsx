import { HeroBanner } from '@/services/heroBannerService'
import Banner from '@/components/Banner'
import ProductIndexPage from '@/components/Product/ProductIndexPage'
import { getApi } from '@/services/apiService'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { slugify } from '@/lib/format'

interface Props {
  params: Promise<{
    locale: string
    category?: string
  }>
  searchParams: Promise<{
    ingredients?: string
    page?: string
  }>
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { ingredients: ingredientsParam, page = '1' } = await searchParams

  const selectedIngredients = ingredientsParam ? ingredientsParam.split(',').filter(Boolean) : []
  
  // Define promises
  const ingredientsPromise = getApi<Ingredient>('ingredients', { params: { lang: locale } }).catch(() => ({ data: [] }));
  const categoriesPromise = getApi<Category>('categories', { params: { lang: locale } }).catch(() => ({ data: [] }));
  const bannerPromise = getApi<HeroBanner>('banners', { params: { position: 'banner_product', lang: locale } }).catch(() => ({ data: [] }));

  let ingredientsData: { data: Ingredient[] };
  let categoriesData: { data: Category[] };
  let bannerData: { data: HeroBanner[] };
  let productsData: { data: Product[], last_page?: number, current_page?: number, total?: number };

  if (selectedIngredients.length === 0) {
    // 100% Parallel fetch for initial load
    [ingredientsData, categoriesData, bannerData, productsData] = await Promise.all([
      ingredientsPromise,
      categoriesPromise,
      bannerPromise,
      getApi<Product>('products', {
        params: {
          lang: locale,
          per_page: 9,
          page: page,
          ingredients: ''
        }
      }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }))
    ]);
  } else {
    // Fetch lookup metadata first, then products
    [ingredientsData, categoriesData, bannerData] = await Promise.all([
      ingredientsPromise,
      categoriesPromise,
      bannerPromise
    ]);

    // Find IDs for ingredients to filter via API with robust multi-locale translation logic
    const findIngredientId = (ingredients: Ingredient[], slug: string, lang: string) => {
      return ingredients.find(ing => {
        // 1. Match translated name slug
        const translation = ing.translations?.find((t: any) => t.locale === lang) ||
                            ing.translations?.find((t: any) => t.locale.startsWith(lang))
        const name = translation?.name || ing.name
        if (slugify(name) === slug) return true

        // 2. Match raw ingredient name slug
        if (slugify(ing.name) === slug) return true

        // 3. Fallback match across any translation
        if (ing.translations?.some((t: any) => slugify(t.name) === slug)) return true

        return false
      })?.id
    }

    const ingredientIds = selectedIngredients
      .map(slug => findIngredientId(ingredientsData.data, slug, locale))
      .filter(Boolean)
      .join(',')

    const { getProductCatalog } = await import('@/services/productService');
    const fullCatalog = await getProductCatalog(locale);

    // Client-side ingredient filtering over full catalog to ensure all items (including combos) are included
    let filteredList = fullCatalog;
    if (ingredientIds) {
      const idArr = ingredientIds.split(',');
      filteredList = fullCatalog.filter(p => 
        idArr.some(id => p.ingredients?.some(ing => String(ing.id) === String(id)))
      );
    }

    const perPage = 9;
    const currPage = parseInt(page, 10) || 1;
    const total = filteredList.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const start = (currPage - 1) * perPage;
    const pageData = filteredList.slice(start, start + perPage);

    productsData = {
      data: pageData,
      current_page: currPage,
      last_page: lastPage,
      total: total
    };
  }

  const bannerItem = bannerData?.data?.[0];
  const banner = {
    image: {
      url: bannerItem?.image || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    },
    image_mobile: {
      url: bannerItem?.image_mobile || bannerItem?.image || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    }
  }

  return (
    <main>
      <Banner banner={banner} />
      <ProductIndexPage
        category={null}
        selectedIngredients={selectedIngredients}
        products={productsData?.data || []}
        categories={categoriesData?.data || []}
        ingredients={ingredientsData?.data || []}
        locale={locale}
        pagination={{
          currentPage: productsData?.current_page || 1,
          lastPage: productsData?.last_page || 1,
          total: productsData?.total || 0,
        }}
      />
    </main>
  )
}
