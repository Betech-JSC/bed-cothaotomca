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

    // Find IDs for ingredients to filter via API with robust translation logic
    const findIngredientId = (ingredients: Ingredient[], slug: string, lang: string) => {
      return ingredients.find(ing => {
        const translation = ing.translations?.find((t: any) => t.locale === lang) ||
                            ing.translations?.find((t: any) => t.locale.startsWith(lang))
        const name = translation?.name || ing.name
        return slugify(name) === slug
      })?.id
    }

    const ingredientIds = selectedIngredients
      .map(slug => findIngredientId(ingredientsData.data, slug, locale))
      .filter(Boolean)
      .join(',')

    productsData = await getApi<Product>('products', {
      params: {
        lang: locale,
        per_page: 9,
        page: page,
        ingredients: ingredientIds
      }
    }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }));
  }

  const bannerItem = bannerData.data[0];
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
        products={productsData.data}
        categories={categoriesData.data}
        ingredients={ingredientsData.data}
        locale={locale}
        pagination={{
          currentPage: productsData.current_page || 1,
          lastPage: productsData.last_page || 1,
          total: productsData.total || 0,
        }}
      />
    </main>
  )
}
